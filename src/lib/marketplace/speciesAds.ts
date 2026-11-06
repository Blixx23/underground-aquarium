import "server-only";
import { unstable_cache } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";
import { loadLibrary, type LibraryEntry } from "@/lib/species/library";
import { mentionsSpecies } from "@/lib/marketplace/match";

/**
 * Ties the classifieds to the species library: which species an ad is about
 * (for its care-guide link) and which live ads mention a species (for the
 * species page's "For sale near you"). One source for both, so they agree.
 */

/** The library's names, cached for an hour: it changes rarely and is read on every ad page. */
const libraryNames = unstable_cache(
  async () =>
    (await loadLibrary()).map((e) => ({
      slug: e.slug,
      common_name: e.common_name,
      names: [e.common_name, e.scientific_name, ...(e.also_known_as ?? []), ...(e.former_names ?? [])],
      parent_slug: e.parent_slug,
    })),
  ["species-library-names"],
  { revalidate: 3600 }
);

/** Animal ads only: plants and gear have no species page. */
export const isLivestock = (category: string | null | undefined) => String(category ?? "").startsWith("livestock-");

/** The species an ad is most likely about, or null. Picks the most specific name it mentions. */
export async function speciesForAd(ad: { title: string; description: string | null; category: string }): Promise<{
  slug: string;
  common_name: string;
} | null> {
  if (!isLivestock(ad.category)) return null;
  const lib = await libraryNames().catch(() => []);
  // Title first: it says what's for sale; the description often lists tankmates.
  for (const text of [ad.title, `${ad.title} ${ad.description ?? ""}`]) {
    let best: { slug: string; common_name: string; score: number } | null = null;
    for (const e of lib) {
      const score = mentionsSpecies(e.names, text);
      if (score > (best?.score ?? 0)) best = { slug: e.slug, common_name: e.common_name, score };
    }
    if (best) return { slug: best.slug, common_name: best.common_name };
  }
  return null;
}

export type SpeciesAd = {
  slug: string;
  title: string;
  price_cents: number | null;
  is_free: boolean;
  is_wanted: boolean;
  city: string | null;
  state_code: string;
  image: string | null;
  lat: number | null;
  lng: number | null;
  area: string | null;
  bumped_at: string;
};

/** Live ads that mention a species (or its variants' names), newest first. */
export async function adsForSpecies(entry: Pick<LibraryEntry, "slug">): Promise<SpeciesAd[]> {
  const lib = await libraryNames().catch(() => []);
  const me = lib.find((e) => e.slug === entry.slug);
  if (!me) return [];
  // A parent species also lists ads for its color forms.
  const family = lib.filter((e) => e.slug === me.slug || e.parent_slug === me.slug);
  const names = family.flatMap((e) => e.names);

  const [{ data: ads }, { data: regions }] = await Promise.all([
    supabasePublic
      .from("listings")
      .select("slug, title, description, category, price_cents, is_free, is_wanted, city, state_code, region_slug, images, bumped_at")
      .eq("status", "active")
      .like("category", "livestock-%")
      .gt("expires_at", new Date().toISOString())
      .order("bumped_at", { ascending: false })
      .limit(1500),
    supabasePublic.from("market_regions").select("state_code, slug, name, lat, lng"),
  ]);
  const where = new Map(
    ((regions ?? []) as { state_code: string; slug: string; name: string; lat: number | null; lng: number | null }[]).map((r) => [
      `${r.state_code}/${r.slug}`,
      r,
    ])
  );
  type Row = {
    slug: string;
    title: string;
    description: string | null;
    category: string;
    price_cents: number | null;
    is_free: boolean;
    is_wanted: boolean;
    city: string | null;
    state_code: string;
    region_slug: string;
    images: string[] | null;
    bumped_at: string;
  };
  // Ads naming it in the title come first; ones that only mention it in the description (a tank lot, say) after.
  const rows = (ads ?? []) as Row[];
  const inTitle = rows.filter((a) => mentionsSpecies(names, a.title) > 0);
  const inText = rows.filter((a) => !inTitle.includes(a) && mentionsSpecies(names, `${a.title} ${a.description ?? ""}`) > 0);
  return [...inTitle, ...inText]
    .slice(0, 40)
    .map((a) => {
      const r = where.get(`${a.state_code}/${a.region_slug}`);
      return {
        slug: a.slug,
        title: a.title,
        price_cents: a.price_cents,
        is_free: a.is_free,
        is_wanted: a.is_wanted,
        city: a.city,
        state_code: a.state_code,
        image: a.images?.[0] ?? null,
        lat: r?.lat ?? null,
        lng: r?.lng ?? null,
        area: r?.name ?? null,
        bumped_at: a.bumped_at,
      };
    });
}
