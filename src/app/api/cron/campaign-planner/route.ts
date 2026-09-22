import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { runAllCampaigns } from "@/lib/campaigns/planner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Once a day: enrol new shops, drop the ones who claimed or opted out,
 * and hand the day's worth of campaign mail to the queue. The worker
 * does the actual sending, so the kill switch and the daily cap still
 * apply on top of this.
 *
 * Add ?dry=1 to see what it would do without queueing anything.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const results = await runAllCampaigns({ dry });
    return NextResponse.json({ ran: true, dry, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Planner failed";
    console.error("[campaign planner]", message);
    return NextResponse.json({ ran: false, error: message }, { status: 500 });
  }
}
