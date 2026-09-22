import { supabasePublic } from "@/lib/supabase/public";

/**
 * Everything the location pages (state, city, and the finder) need about
 * the published shops, grouped by place. One fetch, paged past Supabase's
 * 1000-row cap, cached by the pages that use it.
 */

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington DC",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const stateName = (code: string) => STATE_NAMES[code?.toUpperCase()] ?? code;

/** "San Luis Obispo" -> "san-luis-obispo". */
export function placeSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const STORES_BASE = "/aquarium-stores";
export const statePath = (code: string) => `${STORES_BASE}/${code.toLowerCase()}`;
export const cityPath = (code: string, city: string) =>
  `${STORES_BASE}/${code.toLowerCase()}/${placeSlug(city)}`;

export type PlaceStore = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  tags: string[] | null;
  lat: number | null;
  lng: number | null;
  updated_at: string | null;
  rating_avg: number | null;
  rating_count: number;
};

export type City = {
  state: string;
  name: string;
  slug: string;
  stores: PlaceStore[];
  lat: number | null;
  lng: number | null;
};

const PAGE = 1000;

export async function getPlaceStores(): Promise<PlaceStore[]> {
  const rows: PlaceStore[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("fish_stores")
      .select("id, slug, name, address, city, state, phone, website, tags, lat, lng, updated_at")
      .eq("status", "published")
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...(data as unknown as PlaceStore[]));
    if (data.length < PAGE) break;
  }

  const ratings = new Map<string, { avg: number; count: number }>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("store_ratings")
      .select("store_id, rating_avg, rating_count")
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    for (const r of data as { store_id: string; rating_avg: number; rating_count: number }[]) {
      ratings.set(r.store_id, { avg: Number(r.rating_avg), count: r.rating_count });
    }
    if (data.length < PAGE) break;
  }

  return rows.map((s) => {
    const r = ratings.get(s.id);
    return {
      ...s,
      state: s.state ? s.state.toUpperCase() : null,
      city: s.city?.trim() || null,
      rating_avg: r?.avg ?? null,
      rating_count: r?.count ?? 0,
    };
  });
}

/** Shops grouped into cities, cities keyed "CA/sacramento". */
export function groupCities(stores: PlaceStore[]): Map<string, City> {
  const cities = new Map<string, City>();
  for (const s of stores) {
    if (!s.state || !s.city || !STATE_NAMES[s.state]) continue;
    const slug = placeSlug(s.city);
    if (!slug) continue;
    const key = `${s.state}/${slug}`;
    let c = cities.get(key);
    if (!c) {
      c = { state: s.state, name: s.city, slug, stores: [], lat: null, lng: null };
      cities.set(key, c);
    }
    c.stores.push(s);
  }
  // A city's centre is the average of its shops, good enough for "nearby".
  for (const c of cities.values()) {
    const pts = c.stores.filter((s) => s.lat != null && s.lng != null);
    if (pts.length) {
      c.lat = pts.reduce((a, s) => a + (s.lat as number), 0) / pts.length;
      c.lng = pts.reduce((a, s) => a + (s.lng as number), 0) / pts.length;
    }
  }
  return cities;
}

export function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
