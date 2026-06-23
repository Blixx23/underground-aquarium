import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
function weekKey(d: Date) {
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d.getTime() - dow * 86400000);
  return ymd(monday);
}

// Called once per page-load by a signed-in client. Records the visit, advances
// the streak, and grants the daily / weekly / monthly / streak-milestone awards.
// Every grant is idempotent (deduped by period), so extra calls are harmless.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true });

  const uid = user.id;
  const now = new Date();
  const today = ymd(now);

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("last_active_date, login_streak")
    .eq("id", uid)
    .maybeSingle();

  const last = (prof?.last_active_date as string | null) ?? null;
  if (last === today) return NextResponse.json({ ok: true }); // already counted

  const yesterday = ymd(new Date(now.getTime() - 86400000));
  const streak = last === yesterday ? ((prof?.login_streak as number) ?? 0) + 1 : 1;

  await supabaseAdmin
    .from("profiles")
    .update({ last_active_date: today, login_streak: streak })
    .eq("id", uid);

  // First visit of the day / week / month grants; the rest dedupe to no-ops.
  await awardBubbles(uid, "daily_login", `daily_${today}`);
  await awardBubbles(uid, "weekly_active", `week_${weekKey(now)}`);
  await awardBubbles(uid, "monthly_active", `month_${today.slice(0, 7)}`);

  if (streak === 7) await awardBubbles(uid, "login_streak_7");
  else if (streak === 30) await awardBubbles(uid, "login_streak_30");
  else if (streak === 100) await awardBubbles(uid, "login_streak_100");

  return NextResponse.json({ ok: true });
}
