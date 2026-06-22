import { bubbleTier, TIER_COUNT } from "@/lib/bubbles";

// ---------------------------------------------------------------------------
// Shared, best-effort email sender. Lazy-inits Resend so a missing key never
// breaks the build, and never throws — callers treat email as fire-and-forget.
// ---------------------------------------------------------------------------
export async function sendEmail(opts: {
  to: string | null | undefined;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !opts.to) return false;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    await resend.emails.send({
      from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (e) {
    console.error("Email send failed:", e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Master layout. Every transactional email should render through this so the
// brand, spacing, and typography stay identical across the product. Built with
// table-based, inline-styled, bulletproof HTML for broad email-client support.
// ---------------------------------------------------------------------------
const SITE = "https://www.undergroundaquarium.com";

const C = {
  page: "#e9eef2",
  card: "#ffffff",
  header: "#0a1f33",
  ink: "#0c2740",
  body: "#41566a",
  muted: "#90a3b4",
  accent: "#0e6e8c",
  hair: "#e6ecf1",
  wash: "#f3f7fa",
};

function button(label: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 4px;">
    <tr>
      <td align="center" bgcolor="${C.accent}" style="border-radius:10px;">
        <a href="${url}" style="display:inline-block;padding:14px 30px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function emailLayout(opts: {
  preheader?: string;
  title: string;
  intro?: string;
  bodyHtml?: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${opts.preheader}</div>`
    : "";
  const intro = opts.intro
    ? `<p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${C.body};">${opts.intro}</p>`
    : "";
  const bodyHtml = opts.bodyHtml ?? "";
  const cta = opts.cta ? button(opts.cta.label, opts.cta.url) : "";
  const footerNote =
    opts.footerNote ??
    "You're receiving this because you have an account on Underground Aquarium.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${C.card};border:1px solid ${C.hair};border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td align="center" bgcolor="${C.header}" style="background:${C.header};padding:30px 32px 26px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:6px;color:#eef4f8;line-height:1;">UNDERGROUND</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:8px;color:#6fa1bf;margin-top:6px;line-height:1;">AQUARIUM</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:38px 40px 8px;">
            <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.25;color:${C.ink};font-weight:normal;">${opts.title}</h1>
            ${intro}
            ${bodyHtml}
            ${cta}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 40px 34px;">
            <div style="border-top:1px solid ${C.hair};padding-top:22px;">
              <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${C.muted};">${footerNote}</p>
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${C.muted};">
                <a href="${SITE}" style="color:${C.accent};text-decoration:none;">undergroundaquarium.com</a>
              </p>
            </div>
          </td>
        </tr>

      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
        <tr>
          <td align="center" style="padding:18px 16px 0;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:${C.muted};">© Underground Aquarium · A community for the aquarium hobby</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// A centred highlight block — the "hero" stat at the top of a bubble email.
function bubbleHero(big: string, label: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
    <tr>
      <td align="center" bgcolor="${C.wash}" style="background:${C.wash};border:1px solid ${C.hair};border-radius:14px;padding:26px 20px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1;color:${C.accent};font-weight:bold;">${big}</div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-top:10px;">${label}</div>
      </td>
    </tr>
  </table>`;
}

function statRow(left: string, right: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:11px 0;border-top:1px solid ${C.hair};font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${C.muted};">${left}</td>
      <td align="right" style="padding:11px 0;border-top:1px solid ${C.hair};font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${C.ink};">${right}</td>
    </tr>
  </table>`;
}

// Stacked label/value rows — shared by every email for a consistent detail table.
export function emailStats(rows: Array<[string, string]>): string {
  return rows.map(([l, r]) => statRow(l, r)).join("");
}

// A titled, washed callout box (e.g. a shipping address).
export function emailCallout(label: string, html: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 4px;">
    <tr>
      <td bgcolor="${C.wash}" style="background:${C.wash};border:1px solid ${C.hair};border-radius:12px;padding:16px 18px;">
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-bottom:7px;">${label}</div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${C.ink};">${html}</div>
      </td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Bubble emails (same signatures as before — only the rendering changed).
// ---------------------------------------------------------------------------
export function bubbleAwardEmail(opts: {
  amount: number; // positive number
  granted: boolean; // true = granted, false = deducted
  newBalance: number;
  reason: string;
  username: string | null;
}): { subject: string; html: string } {
  const profileUrl = opts.username ? `${SITE}/u/${opts.username}` : SITE;
  const tier = bubbleTier(opts.newBalance);
  const unit = opts.amount === 1 ? "bubble" : "bubbles";

  const subject = opts.granted
    ? `You earned ${opts.amount} ${unit}`
    : "Your bubbles were adjusted";
  const title = opts.granted ? "You earned bubbles" : "Your bubbles were adjusted";
  const intro = opts.granted
    ? "Nice work — bubbles were added to your account."
    : "An adjustment was made to your bubble balance.";

  const hero = bubbleHero(
    `${opts.granted ? "+" : "−"}${opts.amount}`,
    opts.granted ? "bubbles earned" : "bubbles removed"
  );

  const rows = emailStats([
    ["Reason", escapeHtml(opts.reason)],
    ["New balance", `${opts.newBalance.toLocaleString()} bubbles`],
    ["Current tier", `${tier.name} (${tier.rank}/${TIER_COUNT})`],
  ]);

  const html = emailLayout({
    preheader: opts.granted
      ? `You earned ${opts.amount} ${unit} — ${opts.reason}`
      : `Your bubble balance was adjusted`,
    title,
    intro,
    bodyHtml: hero + rows,
    cta: { label: "View your profile", url: profileUrl },
  });
  return { subject, html };
}

export function tierUpEmail(opts: {
  tierName: string;
  balance: number;
  username: string | null;
}): { subject: string; html: string } {
  const profileUrl = opts.username ? `${SITE}/u/${opts.username}` : SITE;
  const tier = bubbleTier(opts.balance);

  const subject = `You reached ${opts.tierName}`;
  const hero = bubbleHero(opts.tierName, `tier ${tier.rank} of ${TIER_COUNT}`);
  const rows = emailStats([["Balance", `${opts.balance.toLocaleString()} bubbles`]]);

  const html = emailLayout({
    preheader: `Your bubbles carried you into ${opts.tierName}.`,
    title: "You reached a new tier",
    intro: `Your bubbles just carried you into <strong style="color:${C.ink};">${opts.tierName}</strong>. Keep contributing to climb higher.`,
    bodyHtml: hero + rows,
    cta: { label: "See your profile", url: profileUrl },
  });
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
