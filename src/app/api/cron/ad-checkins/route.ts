import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cronAuthorised } from "@/lib/email/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUIET_DAYS = 30;

/**
 * Once a day: ads stay up until they're marked sold, so ask the seller of any
 * ad that hasn't been bumped in 30 days whether it's still available. One
 * note per member (listing up to 3 ads), at most once every 30 days per ad.
 * Lists already sort by last bump, so an ad nobody confirms simply sinks
 * below fresher ones instead of disappearing.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cutoff = new Date(Date.now() - QUIET_DAYS * 86_400_000).toISOString();

  const { data: stale, error } = await supabaseAdmin
    .from("listings")
    .select("id, title, user_id, bumped_at")
    .eq("status", "active")
    .lt("bumped_at", cutoff)
    .order("bumped_at", { ascending: true })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ads = (stale ?? []) as { id: string; title: string; user_id: string }[];
  if (ads.length === 0) return NextResponse.json({ ok: true, notes: 0 });

  // Which sellers were already asked in the last 30 days (about any ad).
  const sellers = [...new Set(ads.map((a) => a.user_id))];
  const asked = new Set<string>();
  for (let i = 0; i < sellers.length; i += 500) {
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("user_id")
      .eq("type", "ad_checkin")
      .gte("created_at", cutoff)
      .in("user_id", sellers.slice(i, i + 500));
    for (const r of (data ?? []) as { user_id: string }[]) asked.add(r.user_id);
  }

  const bySeller = new Map<string, { id: string; title: string }[]>();
  for (const a of ads) {
    if (asked.has(a.user_id)) continue;
    const list = bySeller.get(a.user_id) ?? [];
    list.push(a);
    bySeller.set(a.user_id, list);
  }

  const rows = [...bySeller.entries()].map(([userId, list]) => ({
    user_id: userId,
    type: "ad_checkin",
    title:
      list.length === 1
        ? `Still available? "${list[0].title}"`
        : `Are your ${list.length} ads still available?`,
    body: `${list
      .slice(0, 3)
      .map((a) => a.title)
      .join(" · ")}. Tap Renew in My listings to move it back to the top, or mark it sold so buyers stop asking.`,
    link: "/my/listings",
    data: { listing_ids: list.map((a) => a.id) },
  }));

  let notes = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { error: e } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 200));
    if (!e) notes += Math.min(200, rows.length - i);
  }
  return NextResponse.json({ ok: true, stale: ads.length, notes });
}
