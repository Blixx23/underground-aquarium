/**
 * A shop page with nothing on it but a name and a town: no address, no
 * phone, no description, nobody has claimed or reviewed it. Google treats
 * hundreds of those as low-quality pages, so they stay out of the index
 * (and the sitemap) until any one of those things is filled in.
 */
export function storeIsStub(s: {
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  claimed_by?: string | null;
  reviews?: number | null;
}): boolean {
  const filled = (v: string | null | undefined) => Boolean(v && v.trim());
  return (
    !filled(s.address) &&
    !filled(s.phone) &&
    !filled(s.description) &&
    !filled(s.claimed_by) &&
    (s.reviews ?? 0) === 0
  );
}

/**
 * Whether a city page has more to offer than its one shop's own page: a
 * second shop in town, or another within 30 miles (the page lists those).
 * Mirrors what the city page shows, so the sitemap and the page agree.
 */
export function cityWorthIndexing(
  city: { stores: { id: string }[]; lat: number | null; lng: number | null },
  all: { id: string; lat: number | null; lng: number | null }[],
  milesBetween: (aLat: number, aLng: number, bLat: number, bLng: number) => number,
  nearbyMiles = 30
): boolean {
  if (city.stores.length > 1) return true;
  if (city.lat == null || city.lng == null) return false;
  const here = new Set(city.stores.map((s) => s.id));
  return all.some(
    (s) =>
      !here.has(s.id) &&
      s.lat != null &&
      s.lng != null &&
      milesBetween(city.lat as number, city.lng as number, s.lat, s.lng) <= nearbyMiles
  );
}
