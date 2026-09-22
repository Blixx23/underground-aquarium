import "server-only";
import { SITE } from "@/lib/email/queue";

/** What a step's text can refer to. Anything unknown is left blank. */
export type CampaignVars = {
  shop_name: string;
  city: string;
  state: string;
  page_url: string;
  claim_url: string;
};

export const PLACEHOLDERS: { token: string; means: string }[] = [
  { token: "{{shop_name}}", means: "the shop's name" },
  { token: "{{city}}", means: "the shop's city" },
  { token: "{{state}}", means: "the shop's state" },
  { token: "{{page_url}}", means: "a link to the shop's page" },
  { token: "{{claim_url}}", means: "a link that opens the claim form on the shop's page" },
];

export function varsForStore(s: { name: string; slug: string; city: string | null; state: string | null }): CampaignVars {
  return {
    shop_name: s.name,
    city: s.city ?? "",
    state: s.state ?? "",
    page_url: `${SITE}/stores/${s.slug}`,
    claim_url: `${SITE}/stores/${s.slug}#claim`,
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
 */
export function renderBody(body: string, vars: CampaignVars, cta?: { label?: string | null; url?: string | null }): string {
  const filled = fill(body, vars);
  const paragraphs = filled
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const withLinks = esc(p).replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#0e6e8c;">$1</a>'
      );
      return `<p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#22323f;">${withLinks.replace(
        /\n/g,
        "<br>"
      )}</p>`;
    })
    .join("\n");

  const label = cta?.label?.trim();
  const url = cta?.url ? fill(cta.url, vars).trim() : "";
  const button =
    label && url
      ? `<p style="margin:24px 0 8px;"><a href="${url}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#0e6e8c;color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;">${esc(
          label
        )}</a></p>
         <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#7d8c99;">Or paste this into your browser: ${url}</p>`
      : "";

  return `<div style="max-width:560px;">${paragraphs}${button}</div>`;
}

export function renderSubject(subject: string, vars: CampaignVars): string {
  return fill(subject, vars);
}
