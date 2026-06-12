import type { Metadata } from "next";
import SpeciesExplorer from "@/components/species/SpeciesExplorer";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Freshwater Species",
  description:
    "A curated freshwater aquarium species database with real care data — temperature, pH, tank size, temperament and more. Searchable by name, scientific name, or trade code, including pleco L-numbers and Corydoras.",
};

export default async function SpeciesPage() {
  const { data: species } = await supabasePublic
    .from("species")
    .select(
      "slug, entry_type, common_name, scientific_name, also_known_as, former_names, trade_codes, group_name, max_size_in, min_tank_gal, temp_min_f, temp_max_f, care_level, suitability"
    )
    .order("common_name");

  return <SpeciesExplorer species={species ?? []} />;
}
