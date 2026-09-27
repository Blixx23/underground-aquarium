import type { Metadata } from "next";
import SpeciesExplorer from "@/components/species/SpeciesExplorer";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Freshwater Aquarium Fish Species: 400+ Care Guides",
  description:
    "Care guides for 400+ freshwater aquarium fish, shrimp and snails: tank size, temperature, pH, adult size, temperament and diet, with photos from real keepers.",
  alternates: { canonical: "/species" },
};

export default async function SpeciesPage() {
  const { data: species } = await supabasePublic
    .from("species")
    .select(
      "id, slug, entry_type, common_name, scientific_name, also_known_as, former_names, trade_codes, group_name, max_size_in, min_tank_gal, temp_min_f, temp_max_f, care_level, suitability"
    )
    .order("common_name");

  // Each species' main photo: the one marked as cover, else the first
  // approved. Only approved photos ever reach the page.
  const { data: photos } = await supabaseAdmin
    .from("species_photos")
    .select("species_id, url, is_cover, reviewed_at")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: true })
    .limit(5000);
  const cover = new Map<string, string>();
  for (const ph of (photos ?? []) as { species_id: string; url: string; is_cover: boolean }[]) {
    if (ph.is_cover || !cover.has(ph.species_id)) cover.set(ph.species_id, ph.url);
  }
  // A marked cover wins even if an earlier photo was seen first.
  for (const ph of (photos ?? []) as { species_id: string; url: string; is_cover: boolean }[]) {
    if (ph.is_cover) cover.set(ph.species_id, ph.url);
  }

  const list = ((species ?? []) as ({ id: string } & Record<string, unknown>)[]).map(({ id, ...rest }) => ({
    ...rest,
    cover_url: cover.get(id) ?? null,
  }));

  return <SpeciesExplorer species={list as unknown as Parameters<typeof SpeciesExplorer>[0]["species"]} />;
}