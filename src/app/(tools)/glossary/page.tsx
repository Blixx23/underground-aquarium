import type { Metadata } from "next";
import GlossaryExplorer from "@/components/glossary/GlossaryExplorer";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Aquarium Glossary: 200+ Fishkeeping Terms Explained",
  description:
    "200+ aquarium and fishkeeping terms in plain English, from ammonia and cycling to ich and KH. Searchable, with fixes and common questions for each.",
  alternates: { canonical: "/glossary" },
};

export default async function GlossaryPage() {
  const { data: terms } = await supabasePublic
    .from("glossary_terms")
    .select("slug, term, category, definition")
    .order("term");

  return <GlossaryExplorer terms={terms ?? []} />;
}