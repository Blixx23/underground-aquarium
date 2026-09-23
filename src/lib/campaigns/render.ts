import "server-only";
import { SITE } from "@/lib/email/queue";
import { BRAND } from "@/lib/email/shell";

/** What a step's text can refer to. Anything unknown is left blank. */
export type CampaignVars = {
  shop_name: string;
  city: string;
  state: string;
  page_url: string;
  claim_url: string;
  /** One-press claim, signed, straight from the email. */
  claim_link: string;
  /** A true, checkable sentence about THEIR shop. */
  whats_happening: string;
  /** What is visibly missing from their page, or nothing. */
  whats_missing: string;
};

export const PLACEHOLDERS: { token: string; means: string }[] = [
  { token: "{{shop_name}}", means: "the shop's name" },
  { token: "{{whats_happening}}", means: "a true sentence about their own shop: views, reviews or sightings" },
  { token: "{{whats_missing}}", means: "what's visibly missing from their page, or nothing if it's complete" },
  { token: "{{claim_link}}", means: "one-press claim link, signed, no form to fill in" },
  { token: "{{page_url}}", means: "a plain link to the shop's page" },
  { token: "{{city}}", means: "the shop's city" },
  { token: "{{state}}", means: "the shop's state" },
  { token: "{{claim_url}}", means: "the old link to the claim form on the shop's page" },
];

export function varsForStore(
  s: { id?: string; name: string; slug: string; city: string | null; state: string | null },
  extra: Partial<CampaignVars> = {}
): CampaignVars {
  return {
    shop_name: s.name,
    city: s.city ?? "",
    state: s.state ?? "",
    page_url: `${SITE}/stores/${s.slug}`,
    claim_url: `${SITE}/stores/${s.slug}#claim`,
    claim_link: `${SITE}/stores/${s.slug}#claim`,
    whats_happening: "",
    whats_missing: "",
    ...extra,
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Swap every {{token}} we know about. An unknown token becomes nothing. */
export function fill(text: string, vars: CampaignVars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => {
    const value = (vars as unknown as Record<string, string>)[key.toLowerCase()];
    return value ?? "";
  });
}

/**
 * Campaign mail is written as plain text on purpose: blank lines make
 * paragraphs, a bare URL becomes a link, and nothing else is markup. It
 * should read like a person typed it, not like a template fired.
 *
 * The call to action is an underlined link rather than a filled button.
 * A big coloured button is one of the strongest Promotions tab signals
 * there is, and a link costs nothing in clicks when the words around it
 * are doing the work.
 */
export function renderBody(
  body: string,
  vars: CampaignVars,
  cta?: { label?: string | null; url?: string | null }
): string {
  const filled = fill(body, vars);
  const paragraphs = filled
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const withLinks = esc(p).replace(
        /(https?:\/\/[^\s<]+)/g,
        `<a href="$1" style="color:${BRAND.accent};">$1</a>`
      );
      return `<p style="margin:0 0 17px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.body};">${withLinks.replace(
        /\n/g,
        "<br>"
      )}</p>`;
    })
    .join("\n");

  const label = cta?.label?.trim();
  const url = cta?.url ? fill(cta.url, vars).trim() : "";
  const action =
    label && url
      ? `<p style="margin:22px 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;">
           <a href="${url}" style="color:${BRAND.accent};font-weight:600;">${esc(label)} &rarr;</a>
         </p>
         <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">${url}</p>`
      : "";

  return `${paragraphs}${action}`;
}

export function renderSubject(subject: string, vars: CampaignVars): string {
  return fill(subject, vars);
}

/**
 * The line the inbox shows next to the subject. Taken from the first
 * sentence of the email itself, so it can never promise something the
 * message does not say.
 */
export function previewLine(body: string, vars: CampaignVars): string {
  const first = fill(body, vars)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .find((p) => p.split(/\s+/).length > 4);
  if (!first) return "";
  const sentence = first.replace(/\s+/g, " ").split(/(?<=[.!?])\s/)[0] ?? first;
  return sentence.slice(0, 140);
}
