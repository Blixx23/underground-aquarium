import type { Metadata } from "next";
import GlossaryExplorer from "@/components/glossary/GlossaryExplorer";
import { supabasePublic } from "@/lib/supabase/public";
import { shareMeta } from "@/lib/seo/share";
import { ldJson } from "@/lib/jsonLd";

const SITE = "https://www.undergroundaquarium.com";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Aquarium Glossary: 200+ Fishkeeping Terms Explained",
  description:
    "200+ aquarium and fishkeeping terms in plain English, from ammonia and cycling to ich and KH. Searchable, with fixes and common questions for each.",
  alternates: { canonical: "/glossary" },
  ...shareMeta({ path: "/glossary", alt: "Aquarium glossary, 200+ fishkeeping terms" }),
};

export default async function GlossaryPage() {
  const { data: terms } = await supabasePublic
    .from("glossary_terms")
    .select("slug, term, category, definition")
    .order("term");

  // Tells search engines this page is a set of defined terms, each with its own page.
  const list = terms ?? [];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      name: "Aquarium glossary",
      description: "Aquarium and fishkeeping terms explained in plain English.",
      url: `${SITE}/glossary`,
      hasDefinedTerm: list.map((t) => ({
        "@type": "DefinedTerm",
        name: t.term,
        description: t.definition,
        url: `${SITE}/glossary/${t.slug}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Glossary", item: `${SITE}/glossary` },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <GlossaryExplorer terms={list} />
    </>
  );
}