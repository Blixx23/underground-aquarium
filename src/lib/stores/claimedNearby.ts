import { supabasePublic } from "@/lib/supabase/public";
import { milesBetween } from "@/lib/stores/places";

export type ClaimedShop = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  miles: number;
  rating_avg: number | null;
  rating_count: number;
};

/**
 * Claimed shops close to a point, nearest first. Shown on classified ads and
 * forum threads as free advertising, so shops have a reason to claim their
 * page. Only claimed, published shops; nearest stays nearest (no paid bump).
 */
export async function getClaimedShopsNear(
  lat: number,
  lng: number,
  { maxMiles = 50, limit = 3 } = {}
): Promise<ClaimedShop[]> {
  const dLat = maxMiles / 69;
  const dLng = maxMiles / (69 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));

  // logo_url is a newer column; ask again without it if this database lacks it.
  const base = "id, slug, name, city, state, lat, lng";
  const run = (cols: string) =>
    supabasePublic
      .from("fish_stores")
      .select(cols)
      .eq("status", "published")
      .not("claimed_by", "is", null)
      .gte("lat", lat - dLat)
      .lte("lat", lat + dLat)
      .gte("lng", lng - dLng)
      .lte("lng", lng + dLng)
      .limit(100);
  let res = await run(`${base}, logo_url`);
  if (res.error) res = await run(base);

  type Row = {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    state: string | null;
    lat: number | null;
    lng: number | null;
    logo_url?: string | null;
  };
  const near = ((res.data ?? []) as unknown as Row[])
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({ s, d: milesBetween(lat, lng, s.lat!, s.lng!) }))
    .filter((x) => x.d <= maxMiles)
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
      miles: d,
      rating_avg: r ? Number(r.rating_avg) : null,
      rating_count: r?.rating_count ?? 0,
    };
  });
}
