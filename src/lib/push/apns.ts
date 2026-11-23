import "server-only";
import http2 from "node:http2";
import { createPrivateKey, sign } from "node:crypto";

/**
 * Sends iPhone push notifications straight to Apple (APNs), no third party.
 *
 * Needs four settings in Vercel:
 *  - APNS_KEY_ID       the key's ID from developer.apple.com (Keys)
 *  - APNS_TEAM_ID      39FL7XQJU9
 *  - APNS_PRIVATE_KEY  the whole AuthKey_….p8 file, BEGIN/END lines included
 *  - APNS_BUNDLE_ID    com.undergroundaquarium.app
 *
 * Apple has two servers: production (App Store and TestFlight builds) and
 * sandbox (builds run from Xcode). A device's token only works on one of
 * them, so the first send tries production, falls back to sandbox, and the
 * caller remembers which one worked.
 */

export type ApnsEnv = "production" | "sandbox";

const HOSTS: Record<ApnsEnv, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

export function apnsConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY && process.env.APNS_BUNDLE_ID
  );
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Apple wants a fresh signed token at most once every 20 minutes and
// rejects ones older than an hour. 40 minutes sits safely between.
let cachedJwt: { token: string; at: number } | null = null;

function providerToken(): string {
  const now = Date.now();
  if (cachedJwt && now - cachedJwt.at < 40 * 60 * 1000) return cachedJwt.token;
  // Vercel can store the key with literal \n instead of line breaks.
  const pem = (process.env.APNS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  const header = b64url(JSON.stringify({ alg: "ES256", kid: process.env.APNS_KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(now / 1000) }));
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: createPrivateKey(pem),
    dsaEncoding: "ieee-p1363",
  });
  const token = `${header}.${claims}.${b64url(signature)}`;
  cachedJwt = { token, at: now };
  return token;
}

export type ApnsMessage = {
  title: string;
  body?: string | null;
  /** Where tapping the notification goes, a path on the site. */
  link?: string | null;
  badge?: number;
  /** Groups notifications of one kind together on the lock screen. */
  threadId?: string;
};

export type ApnsResult =
  | { ok: true }
  /** The token is dead (app deleted, notifications switched off): forget it. */
  | { ok: false; gone: true; reason: string }
  /** The token belongs to the other server. */
  | { ok: false; wrongEnv: true; reason: string }
  | { ok: false; reason: string };

function sendOnce(env: ApnsEnv, deviceToken: string, msg: ApnsMessage): Promise<ApnsResult> {
  const payload = JSON.stringify({
    aps: {
      alert: { title: msg.title, ...(msg.body ? { body: msg.body } : {}) },
      sound: "default",
      ...(typeof msg.badge === "number" ? { badge: msg.badge } : {}),
      ...(msg.threadId ? { "thread-id": msg.threadId } : {}),
    },
    ...(msg.link ? { link: msg.link } : {}),
  });

  return new Promise((resolve) => {
    let settled = false;
    const done = (r: ApnsResult) => {
      if (settled) return;
      settled = true;
      try {
        client.close();
      } catch {
        /* already closed */
      }
      resolve(r);
    };
    const client = http2.connect(HOSTS[env]);
    client.on("error", (e) => done({ ok: false, reason: e.message }));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken()}`,
      "apns-topic": process.env.APNS_BUNDLE_ID ?? "",
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0;
    let body = "";
    req.setTimeout(10_000, () => {
      req.close();
      done({ ok: false, reason: "timeout" });
    });
    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => (body += chunk));
    req.on("end", () => {
      if (status === 200) return done({ ok: true });
      let reason = `HTTP ${status}`;
      try {
        reason = (JSON.parse(body) as { reason?: string }).reason ?? reason;
      } catch {
        /* no body */
      }
      if (status === 410 || reason === "Unregistered") return done({ ok: false, gone: true, reason });
      if (reason === "BadDeviceToken" || reason === "BadEnvironmentKeyInToken")
        return done({ ok: false, wrongEnv: true, reason });
      done({ ok: false, reason });
    });
    req.on("error", (e) => done({ ok: false, reason: e.message }));
    req.end(payload);
  });
}

/**
 * Sends to one device. `env` is the server that worked last time, if known.
 * Returns the result plus the server that accepted it.
 */
export async function sendApns(
  deviceToken: string,
  msg: ApnsMessage,
  env: ApnsEnv | null
): Promise<{ result: ApnsResult; env: ApnsEnv }> {
  const first: ApnsEnv = env ?? "production";
  const result = await sendOnce(first, deviceToken, msg);
  if (!result.ok && "wrongEnv" in result && !env) {
    const other: ApnsEnv = first === "production" ? "sandbox" : "production";
    const retry = await sendOnce(other, deviceToken, msg);
    if (retry.ok) return { result: retry, env: other };
    // A token neither server accepts is useless.
    if ("wrongEnv" in retry) return { result: { ok: false, gone: true, reason: retry.reason }, env: other };
    return { result: retry, env: other };
  }
  return { result, env: first };
}
