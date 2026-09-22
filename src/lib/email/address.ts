/**
 * One definition of "is this address usable", server and client.
 * Rejects only what cannot work. Blank is a valid state ("no email"),
 * and odd but real addresses like o'brien+tag@sub.domain.co.uk pass.
 */
const PLACEHOLDER = /(^|@)(example\.(com|org|net)|test\.test|localhost|invalid)$|\.(invalid|test|local)$/i;

export type EmailCheck = { ok: boolean; reason?: string; value: string };

export function checkEmail(input: string | null | undefined): EmailCheck {
  const value = (input ?? "").trim();
  if (!value) return { ok: true, value: "" }; // blank means "none on file"
  if (/\s/.test(value)) return { ok: false, reason: "No spaces in an email address.", value };
  const parts = value.split("@");
  if (parts.length !== 2) return { ok: false, reason: "An address needs one @.", value };
  const [local, domain] = parts;
  if (!local || !domain) return { ok: false, reason: "Something's missing around the @.", value };
  if (!domain.includes(".")) return { ok: false, reason: "The domain looks incomplete.", value };
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes(".."))
    return { ok: false, reason: "The domain looks malformed.", value };
  if (PLACEHOLDER.test(domain)) return { ok: false, reason: "That's a placeholder domain.", value };
  if (value.length > 254) return { ok: false, reason: "That address is too long.", value };
  return { ok: true, value };
}

export const normaliseEmail = (e: string) => e.trim().toLowerCase();
