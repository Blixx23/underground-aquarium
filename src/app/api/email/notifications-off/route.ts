import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validEmailsOffToken } from "@/lib/notificationEmail";

export const dynamic = "force-dynamic";

const SITE = "https://www.undergroundaquarium.com";

/**
 * One click from a notification email: stops notification emails for that
 * member. No login needed; the signed link can't be made up for someone else.
 * The bell on the site keeps working, and it's easy to turn back on.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!u || !t || !validEmailsOffToken(u, t)) {
    return NextResponse.redirect(`${SITE}/notifications#settings`, 303);
  }
  await supabaseAdmin.from("profiles").update({ email_digest: "off" }).eq("id", u);
  return NextResponse.redirect(`${SITE}/notifications?emails=off#settings`, 303);
}

// Mail apps that support one-click unsubscribe send a POST.
export const POST = GET;
