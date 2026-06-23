import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
// Monday (UTC) of the given date's week — used to dedupe weekly awards.
function weekStart(d: Date) {
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(d.getTime() - dow * 86400000);
}

// Each award is verified against the database for the signed-in user before any
// bubbles are granted, so the client can call this freely — it can never fake an
// award it hasn't earned, and grants are idempotent.
const VERIFIERS: Record<string, (userId: string) => Promise<boolean>> = {
  first_tank: async (uid) => {
    const { count } = await supabaseAdmin
      .from("tanks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);
    return (count ?? 0) >= 1;
  },
  first_species: async (uid) => {
    const { data } = await supabaseAdmin
      .from("tanks")
      .select("items")
      .eq("user_id", uid)
      .limit(50);
    return (data ?? []).some((t) => {
      const items = (t as { items?: unknown }).items;
      return Array.isArray(items) && items.length > 0;
    });
  },
  first_water_test: async (uid) => {
    const { count } = await supabaseAdmin
      .from("water_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);
    return (count ?? 0) >= 1;
  },
  first_listing: async (uid) => {
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", uid);
    const storeIds = (stores ?? []).map((r) => (r as { id: string }).id);
    if (storeIds.length === 0) return false;
    const { count } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .in("store_id", storeIds);
    return (count ?? 0) >= 1;
  },
  tank_shared: async (uid) => {
    const { count } = await supabaseAdmin
      .from("tanks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("is_public", true);
    return (count ?? 0) >= 1;
  },
  water_log_streak_week: async (uid) => {
    const since = ymd(weekStart(new Date()));
    const { count } = await supabaseAdmin
      .from("water_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .gte("measured_at", since);
    return (count ?? 0) >= 1;
  },
};

// Sources that recur get a period-scoped dedupe key; the rest default to
// once-per-user (handled inside award_bubbles).
function dedupeFor(source: string): string | undefined {
  if (source === "water_log_streak_week") {
    return `wlog_${ymd(weekStart(new Date()))}`;
  }
  return undefined;
}

export async function POST(req: Request) {
  let body: { source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const source = (body.source ?? "").trim();
  const verify = VERIFIERS[source];
  if (!verify) {
    return NextResponse.json({ error: "Unknown source." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let verified = false;
  try {
    verified = await verify(user.id);
  } catch {
    verified = false;
  }
  if (!verified) {
    return NextResponse.json({ ok: true, amount: 0 });
  }

  const amount = await awardBubbles(user.id, source, dedupeFor(source));
  return NextResponse.json({ ok: true, amount });
}
