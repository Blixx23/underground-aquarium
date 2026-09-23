import "server-only";
import { htmlToText } from "@/lib/email/shell";

/**
 * The only module that talks to Resend. Everything else goes through the
 * queue, so the ledger can never be blind to a send path.
 */
export const FROM_TRANSACTIONAL =
  process.env.RESEND_FROM || "Underground Aquarium <orders@send.undergroundaquarium.com>";
/**
 * Bulk has no fallback on purpose. Guessing an address here would either
 * send outreach from the transactional domain, putting receipts at risk
 * of a shop owner's spam complaint, or send from a subdomain nobody
 * verified, which fails at the provider anyway. Better to refuse and say
 * so, where the admin panel will show it.
 */
export const FROM_BULK = process.env.RESEND_FROM_BULK || "";

/**
 * The domains this site sends from.
 *
 * Resend webhooks are configured per ACCOUNT, not per domain, so one
 * endpoint receives events for every domain in the account, including
 * other projects entirely. Anything whose sender isn't one of these is
 * somebody else's mail and must never touch this database.
 */
export function ourSendingDomains(): string[] {
  const domains = new Set<string>();
  for (const from of [FROM_TRANSACTIONAL, FROM_BULK, process.env.RESEND_FROM, process.env.RESEND_FROM_BULK]) {
    const at = String(from ?? "").match(/@([a-z0-9.-]+)/i);
    if (at?.[1]) domains.add(at[1].toLowerCase());
  }
  for (const extra of String(process.env.EMAIL_EXTRA_DOMAINS ?? "").split(",")) {
    const d = extra.trim().toLowerCase();
    if (d) domains.add(d);
  }
  return [...domains];
}

/** Is this address one of ours? Subdomains of our domains count. */
export function isOurSender(from: string | null | undefined): boolean {
  const at = String(from ?? "").match(/@([a-z0-9.-]+)/i);
  if (!at?.[1]) return false;
  const host = at[1].toLowerCase();
  return ourSendingDomains().some((d) => host === d || host.endsWith("." + d));
}

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  bulk?: boolean;
  replyTo?: string;
  /** Token for the one-click unsubscribe endpoint. Required for bulk. */
  unsubscribeUrl?: string;
  /** The plain half. Derived from the HTML when it isn't given. */
  text?: string;
};

/** Resolves with the provider's message id, or throws for the classifier. */
export async function deliver(args: SendArgs): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  if (args.bulk && !FROM_BULK) {
    throw new Error("RESEND_FROM_BULK is not set, so bulk email has no address to send from.");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(key);

  const headers: Record<string, string> = {};
  if (args.bulk && args.unsubscribeUrl) {
    // RFC 8058: Gmail and Yahoo want one-click unsubscribe on bulk mail.
    headers["List-Unsubscribe"] = `<${args.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const { data, error } = await resend.emails.send({
    from: args.bulk ? FROM_BULK : FROM_TRANSACTIONAL,
    to: args.to,
    subject: args.subject,
    html: args.html,
    // A message with no plain text half is one of the oldest spam
    // signals there is. Every send gets one, whether the caller
    // remembered or not.
    text: args.text ?? htmlToText(args.html),
    replyTo: args.replyTo,
    headers: Object.keys(headers).length ? headers : undefined,
  });

  // The SDK returns errors rather than throwing them; make them throw here
  // so every caller sees failure the same way.
  if (error) throw error;
  return data?.id ?? null;
}
