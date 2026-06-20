import type { Metadata } from "next";
import TankBuilder from "@/components/tank-builder/TankBuilder";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Tank Builder",
  description:
    "Plan a compatible freshwater aquarium: set your tank size, add fish, and get live compatibility, stocking, and heater/filter guidance — with the reasoning behind every recommendation.",
};

export default async function TankBuilderPage() {
  const { data: species } = await supabasePublic
    .from("species")
    .select(
      "slug, common_name, scientific_name, group_name, water_type, temp_min_f, temp_max_f, ph_min, ph_max, gh_min, gh_max, max_size_in, min_tank_gal, temperament, social, min_group_size, swim_level, diet, fin_nipper, suitability"
    )
    .in("entry_type", ["species", "variety", "form"])
    .order("common_name");

  return <TankBuilder species={species ?? []} />;
}