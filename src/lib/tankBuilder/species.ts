import { supabasePublic } from "@/lib/supabase/public";
import { BUILDER_SPECIES_COLUMNS, COMMON_SIZES, computeStocking, suggestTankmates, type Species } from "@/lib/tankBuilder/engine";

export { BUILDER_SPECIES_COLUMNS };

/**
 * Every species the builder can use. Supabase hands back at most 1,000 rows
 * per request, so this pages through them; a single query would silently cut
 * the list off once the database grows past that.
 */
export async function loadBuilderSpecies(): Promise<Species[]> {
  const PAGE = 1000;
  const out: Species[] = [];
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("species")
      .select(BUILDER_SPECIES_COLUMNS)
      .in("entry_type", ["species", "variety", "form"])
      .order("common_name")
      .order("slug")
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    out.push(...(data as unknown as Species[]));
    if (data.length < PAGE) break;
  }
  return out;
}

export { byPopularity, popularityRank } from "@/lib/tankBuilder/popular";

// Species pages each need the whole list to work out tankmates. During a
// build that's hundreds of pages, so share one load for a few minutes.
let cached: { at: number; list: Promise<Species[]> } | null = null;
export function loadBuilderSpeciesShared(): Promise<Species[]> {
  if (!cached || Date.now() - cached.at > 10 * 60_000) {
    const list = loadBuilderSpecies().then((l) => {
      if (l.length === 0) cached = null; // don't hold on to a failed load
      return l;
    });
    cached = { at: Date.now(), list };
  }
  return cached.list;
}

export type Tankmates = {
  gallons: number;
  qty: number;
  picks: { slug: string; common_name: string; qty: number; why: string }[];
};

/**
 * Fish that fit with this one, worked out by the Tank Builder's own rules in
 * a tank sized for it (20 gallons at least, so nano fish still get choices,
 * and roomy enough that the fish's own group doesn't fill it).
 */
export async function tankmatesFor(slug: string, limit = 8): Promise<Tankmates | null> {
  const all = await loadBuilderSpeciesShared();
  const me = all.find((s) => s.slug === slug);
  if (!me || me.temp_min_f == null || me.max_size_in == null) return null;
  const qty = Math.max(1, me.min_group_size ?? 1);
  // Big enough that the group alone leaves room: five angelfish fill a 30 on
  // their own, so their tankmates are worked out for a 75.
  const start = Math.max(me.min_tank_gal ?? 20, 20);
  const gallons =
    COMMON_SIZES.find((g) => g >= start && computeStocking(g, [{ species: me, qty }]).pct <= 50) ?? start;
  const picks = suggestTankmates(gallons, [{ species: me, qty }], all, limit).map((p) => ({
    slug: p.species.slug,
    common_name: p.species.common_name,
    qty: p.qty,
    why: p.why,
  }));
  return { gallons, qty, picks };
}
