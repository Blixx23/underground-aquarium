import { supabasePublic } from "@/lib/supabase/public";
import { milesBetween } from "@/lib/stores/places";

export type ClaimedShop = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  cover_url: string | null;
  miles: number;
  rating_avg: number | null;
  rating_count: number;
};

/**
 * The nearest fish stores to a point, claimed or not, for the shop card on
 * classified ads, forum lists and the tools. Nearest always wins. The visitor
 * never has to share their location: the API route uses the rough location
 * Vercel reads from their connection, or the ad's own area.
 */
/** The site's own shop page. It's ours, not a local store, so it never gets the featured spot. */
function isHouseShop(name: string, slug: string) {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return n === "undergroundaquarium" || slug.toLowerCase().startsWith("underground-aquarium");
}

export async function getShopsNear(
  lat: number,
  lng: number,
  { limit = 3 } = {}
): Promise<ClaimedShop[]> {
  type Row = {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    state: string | null;
    lat: number | null;
    lng: number | null;
    logo_url?: string | null;
    cover_url?: string | null;
  };

  // Look in a box around the point first and widen it until there are enough
  // shops, so we never read the whole directory to find the closest few.
  // logo_url and cover_url are newer columns; ask again without them if missing.
  const base = "id, slug, name, city, state, lat, lng";
  const run = (cols: string, deg: number) =>
    supabasePublic
      .from("fish_stores")
      .select(cols)
      .eq("status", "published")
      .gte("lat", lat - deg)
      .lte("lat", lat + deg)
      .gte("lng", lng - deg * 1.3)
      .lte("lng", lng + deg * 1.3)
      .limit(400);
  let rows: Row[] = [];
  for (const deg of [0.75, 2, 5, 12]) {
    let res = await run(`${base}, logo_url, cover_url`, deg);
    if (res.error) res = await run(base, deg);
    rows = (res.data ?? []) as unknown as Row[];
    if (rows.length >= limit) break;
  }

  const near = rows
    .filter((s) => s.lat != null && s.lng != null && !isHouseShop(s.name, s.slug))
    .map((s) => ({ s, d: milesBetween(lat, lng, s.lat!, s.lng!) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit);
  if (near.length === 0) return [];

  const { data: ratings } = await supabasePublic
    .from("store_ratings")
    .select("store_id, rating_avg, rating_count")
    .in("store_id", near.map((x) => x.s.id));
  const byId = new Map(
    ((ratings ?? []) as { store_id: string; rating_avg: number; rating_count: number }[]).map((r) => [r.store_id, r])
  );

  return near.map(({ s, d }) => {
    const r = byId.get(s.id);
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      city: s.city,
      state: s.state,
      logo_url: s.logo_url ?? null,
      cover_url: s.cover_url ?? null,
      miles: d,
      rating_avg: r ? Number(r.rating_avg) : null,
      rating_count: r?.rating_count ?? 0,
    };
  });
}

/** Old name, kept so nothing else breaks. */
export const getClaimedShopsNear = getShopsNear;
