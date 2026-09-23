import "server-only";

/**
 * The wrapper for mail that goes to people who did not ask for it today:
 * shop outreach, and any campaign.
 *
 * It is deliberately quieter than the receipt layout. Gmail decides the
 * Promotions tab mostly on shape, not on words: a coloured banner across
 * the top, a big filled button, several columns, image-heavy bodies and a
 * footer full of icons all read as an advert. So this is a letter. One
 * column, a modest wordmark, a rule, the words, a link, and a small
 * footer. Brand comes from the typeface, the colour and the restraint,
 * not from furniture.
 */

export const BRAND = {
  ink: "#0c2740",
  body: "#22323f",
  muted: "#7d8c99",
  accent: "#0e6e8c",
  hair: "#e6ecf1",
};

export const POSTAL = "1609 Blanchard Drive, Roseville, CA 95747";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type ShellArgs = {
  /** The line mailboxes show next to the subject. One short sentence. */
  preheader?: string;
  /** Paragraphs and links. A fragment, not a whole document. */
  contentHtml: string;
  /** Given, the footer carries the postal address and the opt out. */
  unsubscribeUrl?: string;
  /** Why they are hearing from us. Kept honest and specific. */
  reason?: string;
  /** The "take it down" offer. Present, but in the footer, not the pitch. */
  removalNote?: boolean;
};

export function letterShell({ preheader, contentHtml, unsubscribeUrl, reason, removalNote = true }: ShellArgs): string {
  const preview = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>`
    : "";

  const footer = unsubscribeUrl
    ? `
        <tr>
          <td style="padding:26px 0 0;">
            <div style="border-top:1px solid ${BRAND.hair};padding-top:16px;">
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">
                ${esc(reason ?? "You're getting this because your shop is listed in our free directory.")}${
                  removalNote ? " Reply with the word remove and I'll take the page down." : ""
                }<br>
                <a href="${unsubscribeUrl}" style="color:${BRAND.muted};">Unsubscribe</a> and I won't email you again.<br>
                Underground Aquarium, ${POSTAL}
              </p>
            </div>
          </td>
        </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>:root{color-scheme:light;supported-color-schemes:light}</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
${preview}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  <tr>
    <td align="left" style="padding:28px 20px 40px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">

        <tr>
          <td style="padding:0 0 22px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:3px;color:${BRAND.ink};line-height:1;">UNDERGROUND AQUARIUM</div>
            <div style="width:38px;height:2px;background:${BRAND.accent};margin-top:10px;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:0;">
            ${contentHtml}
          </td>
        </tr>
${footer}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * The plain text half of the message.
 *
 * Every email should carry one. A message with no text part is one of the
 * oldest and cheapest spam signals there is, and mailboxes that show a
 * text preview look far better with a real one. Derived from the HTML so
 * the two can never drift apart.
 */
export function htmlToText(html: string): string {
  let s = html;

  // Anything that is not prose.
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<head[\s\S]*?<\/head>/gi, "");
  // Hidden preheaders would otherwise open every message twice.
  s = s.replace(/<div[^>]*display:\s*none[\s\S]*?<\/div>/gi, "");

  // Links become "text (url)", unless the text already is the url.
  s = s.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
    const words = label.replace(/<[^>]+>/g, "").trim();
    if (!words) return href;
    if (words === href || href.startsWith("mailto:")) return words;
    return `${words} (${href})`;
  });

  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|tr|h1|h2|h3|li)>/gi, "\n\n");
  s = s.replace(/<li\b[^>]*>/gi, "- ");
  s = s.replace(/<[^>]+>/g, "");

  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&rsquo;/gi, "'");

  // Tidy: no trailing spaces, no runs of blank lines.
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return s;
}
