import type { Metadata } from "next";
import GlossaryExplorer from "@/components/glossary/GlossaryExplorer";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "A glossary of 200+ aquarium and fishkeeping terms in plain English — searchable, filterable, and explained for beginners and pros alike.",
};

export default async function GlossaryPage() {
  const { data: terms } = await supabasePublic
    .from("glossary_terms")
    .select("slug, term, category, definition")
    .order("term");

  return <GlossaryExplorer terms={terms ?? []} />;
}