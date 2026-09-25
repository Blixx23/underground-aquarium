import { supabasePublic } from "@/lib/supabase/public";
import type { Species } from "@/lib/tankBuilder/engine";

export const BUILDER_SPECIES_COLUMNS =
  "slug, common_name, scientific_name, group_name, water_type, temp_min_f, temp_max_f, ph_min, ph_max, gh_min, gh_max, max_size_in, min_tank_gal, temperament, social, min_group_size, swim_level, diet, fin_nipper, suitability";

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
