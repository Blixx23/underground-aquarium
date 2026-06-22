// Shared best-effort email sender. Lazy-inits Resend so a missing key never
// breaks the build, and never throws — callers treat email as fire-and-forget.
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

const SITE = "https://www.undergroundaquarium.com";

function shell(inner: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;max-width:520px">${inner}<p style="color:#94a3b8;font-size:12px;margin-top:24px">Underground Aquarium</p></div>`;
}

export function bubbleAwardEmail(opts: {
  amount: number; // positive number
  granted: boolean; // true = granted, false = deducted
  newBalance: number;
  reason: string;
  username: string | null;
}): { subject: string; html: string } {
  const profileUrl = opts.username ? `${SITE}/u/${opts.username}` : SITE;
  const verb = opts.granted ? "awarded" : "removed";
  const subject = opts.granted
    ? `You earned ${opts.amount} bubble${opts.amount === 1 ? "" : "s"}`
    : `Your bubbles were adjusted`;
  const html = shell(`
    <p style="font-size:16px">You were ${verb} <strong>${opts.amount} bubble${
    opts.amount === 1 ? "" : "s"
  }</strong> on Underground Aquarium.</p>
    <p style="color:#475569">Reason: ${opts.reason}</p>
    <p style="font-size:16px">Your balance is now <strong>${opts.newBalance}</strong>.</p>
    <p><a href="${profileUrl}" style="color:#0d9488">View your profile</a></p>
  `);
  return { subject, html };
}

export function tierUpEmail(opts: {
  tierName: string;
  balance: number;
  username: string | null;
}): { subject: string; html: string } {
  const profileUrl = opts.username ? `${SITE}/u/${opts.username}` : SITE;
  const subject = `You reached ${opts.tierName} on Underground Aquarium`;
  const html = shell(`
    <p style="font-size:16px">Nice work — your bubbles just carried you into <strong>${opts.tierName}</strong>.</p>
    <p style="color:#475569">You're now at <strong>${opts.balance}</strong> bubbles.</p>
    <p><a href="${profileUrl}" style="color:#0d9488">See your profile</a></p>
  `);
  return { subject, html };
}
