import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { milesBetween } from "@/lib/marketplace/match";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RADIUS_MILES = 40;

type Spot = { lat: number; lng: number; label: string };

/** Monday's date in Los Angeles once it's 9am there, else null. */
function mondayKey(now = new Date()): string | null {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value])
  );
  if (p.weekday !== "Mon" || Number(p.hour) < 9) return null;
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Monday morning: one "this week near you" note per member who has an area,
 * with new ads and shop posts within 40 miles. It goes in the bell, and the
 * usual notification email sends it (members can switch it off under
 * "Weekly near you"). Nothing is sent when there's nothing new nearby.
 *
 * A member's area is, in order: a saved classified alert, the area of their
 * latest ad, or a shop they follow. Once per member per week.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const week = mondayKey();
  const force = new URL(req.url).searchParams.get("week");
  const key = week ?? (force && /^\d{4}-\d{2}-\d{2}$/.test(force) ? force : null);
  if (!key) return NextResponse.json({ ok: true, skipped: "not Monday morning" });

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [regionsRes, alertsRes, myAdsRes, favsRes, adsRes, postsRes, doneRes, unansweredRes] = await Promise.all([
    supabaseAdmin.from("market_regions").select("id, name, slug, state_code, lat, lng"),
    supabaseAdmin.from("listing_alerts").select("user_id, lat, lng, place_label").eq("active", true),
    supabaseAdmin.from("listings").select("user_id, region_id, created_at").order("created_at", { ascending: false }).limit(5000),
    supabaseAdmin.from("store_favorites").select("user_id, fish_store_id").limit(10000),
    supabaseAdmin
      .from("listings")
      .select("id, slug, title, user_id, region_id, is_wanted")
      .eq("status", "active")
      .gte("created_at", since)
      .limit(2000),
    supabaseAdmin.from("store_posts").select("id, store_id, title, created_at").gte("created_at", since).limit(2000),
    supabaseAdmin.from("notifications").select("user_id").eq("type", "weekly_local").eq("data->>week", key).limit(20000),
    supabaseAdmin
      .from("forum_threads")
      .select("id", { count: "exact", head: true })
      .eq("reply_count", 0)
      .eq("is_seeded", false)
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ]);
  if (adsRes.error) return NextResponse.json({ error: adsRes.error.message }, { status: 500 });

  type Region = { id: string; name: string; slug: string; state_code: string; lat: number | null; lng: number | null };
  const regions = ((regionsRes.data ?? []) as Region[]).filter((r) => r.lat !== null && r.lng !== null);
  const regionById = new Map(regions.map((r) => [r.id, r]));
  const done = new Set(((doneRes.data ?? []) as { user_id: string }[]).map((d) => d.user_id));

  // Shops: for followed-shop areas and for where each post happened.
  const storeIds = new Set<string>();
  for (const f of (favsRes.data ?? []) as { fish_store_id: string }[]) storeIds.add(f.fish_store_id);
  for (const p of (postsRes.data ?? []) as { store_id: string }[]) storeIds.add(p.store_id);
  const shops = new Map<string, { name: string; slug: string; city: string | null; lat: number; lng: number }>();
  if (storeIds.size) {
    const ids = [...storeIds];
    for (let i = 0; i < ids.length; i += 500) {
      const { data } = await supabaseAdmin
        .from("fish_stores")
        .select("id, name, slug, city, lat, lng")
        .in("id", ids.slice(i, i + 500));
      for (const s of (data ?? []) as { id: string; name: string; slug: string; city: string | null; lat: number | null; lng: number | null }[]) {
        if (s.lat !== null && s.lng !== null) shops.set(s.id, { name: s.name, slug: s.slug, city: s.city, lat: s.lat, lng: s.lng });
      }
    }
  }

  // Each member's area, first source wins.
  const area = new Map<string, Spot>();
  for (const a of (alertsRes.data ?? []) as { user_id: string; lat: number; lng: number; place_label: string }[]) {
    if (!area.has(a.user_id)) area.set(a.user_id, { lat: a.lat, lng: a.lng, label: a.place_label });
  }
  for (const l of (myAdsRes.data ?? []) as { user_id: string; region_id: string | null }[]) {
    const r = l.region_id ? regionById.get(l.region_id) : undefined;
    if (r && !area.has(l.user_id)) area.set(l.user_id, { lat: r.lat!, lng: r.lng!, label: r.name });
  }
  for (const f of (favsRes.data ?? []) as { user_id: string; fish_store_id: string }[]) {
    const s = shops.get(f.fish_store_id);
    if (s && !area.has(f.user_id)) area.set(f.user_id, { lat: s.lat, lng: s.lng, label: s.city ?? s.name });
  }

  // Members who switched this off, or are gone, are skipped.
  const userIds = [...area.keys()].filter((u) => !done.has(u));
  const skip = new Set<string>();
  for (let i = 0; i < userIds.length; i += 500) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email_off, deleted_at, suspended_at")
      .in("id", userIds.slice(i, i + 500));
    for (const p of (data ?? []) as { id: string; email_off: string[] | null; deleted_at: string | null; suspended_at: string | null }[]) {
      if (p.deleted_at || p.suspended_at || (p.email_off ?? []).includes("weekly_local")) skip.add(p.id);
    }
  }

  const ads = ((adsRes.data ?? []) as { id: string; slug: string; title: string; user_id: string; region_id: string | null; is_wanted: boolean }[])
    .map((a) => ({ ...a, region: a.region_id ? regionById.get(a.region_id) : undefined }))
    .filter((a) => a.region);
  const posts = ((postsRes.data ?? []) as { id: string; store_id: string; title: string | null }[])
    .map((p) => ({ ...p, shop: shops.get(p.store_id) }))
    .filter((p) => p.shop);
  const unanswered = unansweredRes.count ?? 0;

  const rows: Record<string, unknown>[] = [];
  for (const userId of userIds) {
    if (skip.has(userId)) continue;
    const spot = area.get(userId)!;
    const nearAds = ads.filter((a) => a.user_id !== userId && milesBetween(spot, { lat: a.region!.lat!, lng: a.region!.lng! }) <= RADIUS_MILES);
    const nearPosts = posts.filter((p) => milesBetween(spot, p.shop!) <= RADIUS_MILES);
    if (nearAds.length === 0 && nearPosts.length === 0) continue;

    // The closest classifieds area, so the link opens on their own city.
    let home: Region | null = null;
    let best = Infinity;
    for (const r of regions) {
      const d = milesBetween(spot, { lat: r.lat!, lng: r.lng! });
      if (d < best) {
        best = d;
        home = r;
      }
    }

    const counts = [
      nearAds.length ? `${nearAds.length} new ad${nearAds.length === 1 ? "" : "s"}` : null,
      nearPosts.length ? `${nearPosts.length} shop update${nearPosts.length === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    const lines = [
      ...nearAds.slice(0, 3).map((a) => `${a.is_wanted ? "Wanted: " : ""}${a.title}`),
      ...nearPosts.slice(0, 2).map((p) => `${p.shop!.name}: ${p.title || "new post"}`),
    ];
    if (unanswered > 0) lines.push(`${unanswered} forum question${unanswered === 1 ? "" : "s"} waiting for an answer`);

    rows.push({
      user_id: userId,
      type: "weekly_local",
      title: `This week near ${spot.label}: ${counts.join(", ")}`,
      body: lines.join(" · "),
      link: home ? `/marketplace/${home.state_code.toLowerCase()}/${home.slug}` : "/listings",
      data: { week: key, ads: nearAds.length, posts: nearPosts.length },
    });
  }

  let sent = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 200));
    if (!error) sent += Math.min(200, rows.length - i);
  }
  return NextResponse.json({ ok: true, week: key, members: userIds.length, sent });
}
