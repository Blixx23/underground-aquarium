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
 * The nearest claimed shops to a point, for the "Featured shops" box on
 * classified ads and forum threads. Free advertising for now, so shops that
 * claim their page see themselves pop up. Nearest always wins (no paid
 * bump), and there's no distance cutoff: with only a few claimed shops so
 * far, a cutoff would leave most pages empty. The distance is shown, so it
 * stays honest.
 */
/** The site's own shop page. It's ours, not a local store, so it never gets the featured spot. */
function isHouseShop(name: string, slug: string) {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return n === "undergroundaquarium" || slug.toLowerCase().startsWith("underground-aquarium");
}

export async function getClaimedShopsNear(
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

  // Claimed shops are a small set, so read them all and sort by distance.
  // logo_url and cover_url are newer columns; ask again without it if this database lacks it.
  const base = "id, slug, name, city, state, lat, lng";
  const run = (cols: string) =>
    supabasePublic
      .from("fish_stores")
      .select(cols)
      .eq("status", "published")
      .not("claimed_by", "is", null)
      .not("lat", "is", null)
      .limit(2000);
  let res = await run(`${base}, logo_url, cover_url`);
  if (res.error) res = await run(base);

  const near = ((res.data ?? []) as unknown as Row[])
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
