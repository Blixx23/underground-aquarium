import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cronAuth";
import {
  replyNudges,
  eventReminders,
  savedAdUpdates,
  waterReminders,
  comebackNudges,
  topShopCloseNudges,
} from "@/lib/nudges";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Hourly: reply reminders, event-tomorrow reminders, saved-ad price drops
 * and sales, water test reminders, the come-back note, and the mid-quarter
 * Top Stores nudge. Each job knows what it already sent, and the slower
 * ones only act at their own time of day, so hourly is safe.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jobs = {
    replies: replyNudges,
    events: eventReminders,
    savedAds: savedAdUpdates,
    water: waterReminders,
    comeback: comebackNudges,
    topStores: topShopCloseNudges,
  };
  const out: Record<string, number | string> = {};
  for (const [name, fn] of Object.entries(jobs)) {
    try {
      out[name] = await fn();
    } catch (e) {
      out[name] = e instanceof Error ? `error: ${e.message}` : "error";
      console.error(`[nudges] ${name}`, e);
    }
  }
  return NextResponse.json({ ok: true, ...out });
}
