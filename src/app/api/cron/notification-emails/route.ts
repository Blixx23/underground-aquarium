import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { runNotificationEmails } from "@/lib/notificationEmail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Every 15 minutes: emails members about bell notifications they haven't
 * seen, bundled, in the categories and at the pace they chose.
 * Add ?dry=1 to count what it would send without sending.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    return NextResponse.json({ ran: true, dry, ...(await runNotificationEmails({ dry })) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    console.error("[notification emails]", message);
    return NextResponse.json({ ran: false, error: message }, { status: 500 });
  }
}
