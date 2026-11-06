import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CATEGORIES } from "@/lib/marketplace/categories";
import { ALERT_RADII, MAX_ALERTS_PER_MEMBER } from "@/lib/marketplace/match";

export const dynamic = "force-dynamic";

/**
 * A member's classified alerts: "tell me when someone near me lists ___".
 * GET lists them, POST saves one, PATCH pauses or resumes, DELETE removes.
 * The matching itself runs in /api/cron/listing-alerts.
 */

const COLS = "id, query, category, place_label, lat, lng, radius_miles, include_wanted, active, created_at, last_hit_at";

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

const missingTable = (msg?: string) => /listing_alerts/.test(msg ?? "") && /does not exist|schema cache/i.test(msg ?? "");

export async function GET() {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from("listing_alerts")
    .select(COLS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: missingTable(error.message) ? "Alerts aren't switched on yet." : error.message },
      { status: missingTable(error.message) ? 503 : 500 }
    );
  }
  return NextResponse.json({ alerts: data ?? [] });
}

export async function POST(req: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Sign in to save an alert." }, { status: 401 });

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const query = typeof b.query === "string" ? b.query.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  const category = typeof b.category === "string" && b.category !== "all" ? b.category : null;
  if (category && !CATEGORIES.some((c) => c.key === category)) {
    return NextResponse.json({ error: "Pick a category from the list." }, { status: 400 });
  }
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Pick where to search." }, { status: 400 });
  }
  const place = typeof b.place_label === "string" ? b.place_label.trim().slice(0, 80) : "";
  if (!place) return NextResponse.json({ error: "Pick where to search." }, { status: 400 });
  const radius = (ALERT_RADII as readonly number[]).includes(Number(b.radius_miles)) ? Number(b.radius_miles) : 50;
  if (!query && !category) {
    return NextResponse.json({ error: "Add a word or pick a category, so you don't get every ad." }, { status: 400 });
  }

  const { count, error: countError } = await supabaseAdmin
    .from("listing_alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("active", true);
  if (countError) {
    return NextResponse.json(
      { error: missingTable(countError.message) ? "Alerts aren't switched on yet." : countError.message },
      { status: missingTable(countError.message) ? 503 : 500 }
    );
  }
  if ((count ?? 0) >= MAX_ALERTS_PER_MEMBER) {
    return NextResponse.json(
      { error: `You have ${MAX_ALERTS_PER_MEMBER} alerts on. Pause or remove one on My alerts first.` },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("listing_alerts")
    .insert({
      user_id: user.id,
      query: query || null,
      category,
      lat,
      lng,
      place_label: place,
      radius_miles: radius,
      include_wanted: b.include_wanted === true,
    })
    .select(COLS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, alert: data });
}

export async function PATCH(req: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; active?: boolean };
  if (!b.id || typeof b.active !== "boolean") return NextResponse.json({ error: "Which alert?" }, { status: 400 });
  if (b.active) {
    const { count } = await supabaseAdmin
      .from("listing_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("active", true);
    if ((count ?? 0) >= MAX_ALERTS_PER_MEMBER) {
      return NextResponse.json({ error: `You already have ${MAX_ALERTS_PER_MEMBER} alerts on.` }, { status: 400 });
    }
  }
  const { error } = await supabaseAdmin.from("listing_alerts").update({ active: b.active }).eq("id", b.id).eq("user_id", user.id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which alert?" }, { status: 400 });
  const { error } = await supabaseAdmin.from("listing_alerts").delete().eq("id", id).eq("user_id", user.id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
