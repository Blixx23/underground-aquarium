import "server-only";

/**
 * The only module that talks to Resend. Everything else goes through the
 * queue, so the ledger can never be blind to a send path.
 */
export const FROM_TRANSACTIONAL =
  process.env.RESEND_FROM || "Underground Aquarium <orders@send.undergroundaquarium.com>";
export const FROM_BULK =
  process.env.RESEND_FROM_BULK || "Chris at Underground Aquarium <chris@mail.undergroundaquarium.com>";

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  bulk?: boolean;
  replyTo?: string;
  /** Token for the one-click unsubscribe endpoint. Required for bulk. */
  unsubscribeUrl?: string;
};

/** Resolves with the provider's message id, or throws for the classifier. */
export async function deliver(args: SendArgs): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

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
    replyTo: args.replyTo,
    headers: Object.keys(headers).length ? headers : undefined,
  });

  // The SDK returns errors rather than throwing them; make them throw here
  // so every caller sees failure the same way.
  if (error) throw error;
  return data?.id ?? null;
}
