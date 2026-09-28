import { NextResponse } from "next/server";
import { suppress } from "@/lib/email/suppress";
import { optOut } from "@/lib/email/optOut";
import { normaliseEmail } from "@/lib/email/address";
import { validUnsubscribeToken } from "@/lib/email/queue";

export const dynamic = "force-dynamic";

/**
 * One click, no login, no confirmation screen. Gmail and Yahoo POST here
 * for one-click unsubscribe (RFC 8058), and people clicking the link in
 * the footer arrive by GET. Both must work, and a page route only
 * answers GET, which is how one-click ends up returning 405 to Gmail.
 */
async function off(req: Request): Promise<{ ok: boolean; email: string }> {
  const url = new URL(req.url);
  let email = url.searchParams.get("e") ?? "";
  let token = url.searchParams.get("t") ?? "";

  if (!email && req.method === "POST") {
    // Some clients post the parameters as a form body instead.
    try {
      const form = await req.formData();
      email = String(form.get("e") ?? email);
      token = String(form.get("t") ?? token);
    } catch {
      /* one-click posts an empty body; the query string is what counts */
    }
  }
  if (!email || !validUnsubscribeToken(email, token)) return { ok: false, email };
  try {
    // Same as the admin button: off every campaign, no outreach waiting
    // in the outbox, and one friendly confirmation. Only the first click
    // confirms, so pressing it twice doesn't send two. This only stops
    // marketing and outreach; account and message email keeps coming.
    await optOut({
      pattern: normaliseEmail(email),
      extraEmail: email,
      confirm: true,
      confirmNewOnly: true,
      why: "Unsubscribe link",
    });
  } catch (err) {
    // Whatever else went wrong, the address must still come off.
    console.error("[unsubscribe]", err);
    await suppress(email, "unsubscribe");
  }
  return { ok: true, email };
}

export async function POST(req: Request) {
  const r = await off(req);
  // Always 200 for one-click: a mail client showing an error helps nobody.
  return NextResponse.json({ ok: r.ok });
}

/** The address comes from the link, so escape it before it goes in the page. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  const r = await off(req);
  const html = r.ok
    ? `<h1 style="font:600 22px Helvetica,Arial;color:#0c2740;">You're unsubscribed</h1>
       <p style="font:15px Helvetica,Arial;color:#41566a;">${esc(r.email)} won't get any more marketing or outreach emails from Underground Aquarium.</p>
       <p style="font:15px Helvetica,Arial;color:#41566a;">If you have an account, emails about your account and your messages will still arrive. Questions? Email support@undergroundaquarium.com.</p>`
    : `<h1 style="font:600 22px Helvetica,Arial;color:#0c2740;">That link didn't work</h1>
       <p style="font:15px Helvetica,Arial;color:#41566a;">Email support@undergroundaquarium.com and we'll take you off the list by hand.</p>`;
  return new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
     <div style="max-width:32rem;margin:12vh auto;padding:0 24px;text-align:center;">${html}</div>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
