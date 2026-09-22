import { supabasePublic } from "@/lib/supabase/public";
import { milesBetween, type PlaceStore } from "@/lib/stores/places";

/**
 * Other published shops close to a point, nearest first. Looks in a box
 * about 50 miles across so it never has to pull the whole directory.
 */
export async function getNearbyStores(
  lat: number | null,
  lng: number | null,
  excludeId: string,
  { maxMiles = 30, limit = 4 } = {}
): Promise<{ s: PlaceStore; d: number }[]> {
  if (lat == null || lng == null) return [];
  const dLat = maxMiles / 69;
  const dLng = maxMiles / (69 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));

  const { data } = await supabasePublic
    .from("fish_stores")
    .select("id, slug, name, address, city, state, phone, website, tags, lat, lng, updated_at")
    .eq("status", "published")
    .neq("id", excludeId)
    .gte("lat", lat - dLat)
    .lte("lat", lat + dLat)
    .gte("lng", lng - dLng)
    .lte("lng", lng + dLng)
    .limit(200);

  const near = ((data ?? []) as unknown as PlaceStore[])
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
    return { s: { ...s, rating_avg: r ? Number(r.rating_avg) : null, rating_count: r?.rating_count ?? 0 }, d };
  });
}
