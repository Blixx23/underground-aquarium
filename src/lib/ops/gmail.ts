import "server-only";
import { createSign } from "node:crypto";

/**
 * Gmail for the Support Desk, through a Google Workspace service account
 * with domain-wide delegation (no Google SDK, just signed requests).
 *
 * It can read support email and save reply DRAFTS. There is deliberately no
 * send function anywhere in this file: Chris reviews and sends every reply.
 *
 * Setup (Vercel environment variables):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  the service account's JSON key, pasted whole
 *   OPS_GMAIL_USER               mailbox support@ mail lands in (default chris@undergroundaquarium.com)
 *   OPS_SUPPORT_ADDRESS          the support address (default support@undergroundaquarium.com)
 */

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
].join(" ");

export function gmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

export function supportAddress(): string {
  return process.env.OPS_SUPPORT_ADDRESS || "support@undergroundaquarium.com";
}

function mailbox(): string {
  return process.env.OPS_GMAIL_USER || "chris@undergroundaquarium.com";
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON isn't set in Vercel.");
  let key: { client_email: string; private_key: string; token_uri?: string };
  try {
    key = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON isn't valid JSON. Paste the whole key file.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      sub: mailbox(),
      scope: SCOPES,
      aud: key.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(key.private_key.replace(/\\n/g, "\n")).toString("base64url");

  const res = await fetch(key.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Google refused the service account (${res.status}). Check domain-wide delegation and its scopes: ${(await res.text()).slice(0, 200)}`
    );
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function gmail<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[]; headers?: { name: string; value: string }[] };

function findText(p: Part | undefined): string {
  if (!p) return "";
  if (p.mimeType === "text/plain" && p.body?.data) return Buffer.from(p.body.data, "base64url").toString("utf8");
  for (const c of p.parts ?? []) {
    const t = findText(c);
    if (t) return t;
  }
  if (p.mimeType === "text/html" && p.body?.data) {
    return Buffer.from(p.body.data, "base64url")
      .toString("utf8")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");
  }
  return "";
}

/** Drops the quoted history under "On ... wrote:" so the agent reads only the new message. */
function stripQuoted(text: string): string {
  const cut = text.search(/\n(On .{5,200}wrote:|-{2,}\s*Original Message|From: .+\nSent: )/);
  return (cut > 0 ? text.slice(0, cut) : text).trim();
}

export type SupportEmail = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  messageId: string;
  snippet: string;
  body: string;
};

/** Recent support messages, newest first (ids only + headers). */
export async function listSupportEmails(days = 7, max = 25): Promise<{ id: string; threadId: string }[]> {
  const q = encodeURIComponent(`to:${supportAddress()} newer_than:${days}d -from:${supportAddress()} -from:${mailbox()}`);
  const data = await gmail<{ messages?: { id: string; threadId: string }[] }>(`messages?q=${q}&maxResults=${max}`);
  return data.messages ?? [];
}

export async function readSupportEmail(id: string): Promise<SupportEmail> {
  const m = await gmail<{ id: string; threadId: string; snippet: string; payload: Part }>(`messages/${id}?format=full`);
  const h = (name: string) => m.payload.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase())?.value ?? "";
  return {
    id: m.id,
    threadId: m.threadId,
    from: h("From"),
    subject: h("Subject"),
    date: h("Date"),
    messageId: h("Message-ID"),
    snippet: m.snippet,
    body: stripQuoted(findText(m.payload)).slice(0, 6000),
  };
}

/** Saves a reply as a Gmail draft in the same thread. Never sends. */
export async function createReplyDraft(original: SupportEmail, replyText: string): Promise<string> {
  const subject = /^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const mime = [
    `From: Underground Aquarium <${supportAddress()}>`,
    `To: ${original.from}`,
    `Subject: ${encodedSubject}`,
    original.messageId ? `In-Reply-To: ${original.messageId}` : "",
    original.messageId ? `References: ${original.messageId}` : "",
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(replyText).toString("base64"),
  ]
    .filter((l, i, all) => l !== "" || i === all.length - 2)
    .join("\r\n");
  const draft = await gmail<{ id: string }>("drafts", {
    method: "POST",
    body: JSON.stringify({ message: { raw: b64url(mime), threadId: original.threadId } }),
  });
  return draft.id;
}

/** True when the newest message in the thread is from us, so it's already answered. */
export async function threadAnswered(threadId: string): Promise<boolean> {
  const t = await gmail<{ messages: { payload: Part; labelIds?: string[] }[] }>(`threads/${threadId}?format=metadata&metadataHeaders=From`);
  const last = t.messages[t.messages.length - 1];
  const from = last?.payload.headers?.find((x) => x.name === "From")?.value ?? "";
  return from.includes(supportAddress()) || from.includes(mailbox()) || (last?.labelIds ?? []).includes("SENT");
}
