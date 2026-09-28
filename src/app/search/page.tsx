import type { Metadata } from "next";
import SiteSearch from "@/components/search/SiteSearch";
import { siteSearch } from "@/lib/search/site";

// Results pages are for people, not Google: every one would be thin and near-duplicate.
export const metadata: Metadata = {
  title: "Search",
  description: "Search Underground Aquarium: help answers, fish species and care, classifieds, stores, forums, events and more.",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  // Render results on the server too, so a shared /search?q= link loads with answers.
  const initial =
    query.length >= 2
      ? await siteSearch(query, 6).catch(() => ({ groups: [], correctedTo: null }))
      : { groups: [], correctedTo: null };

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">Search</p>
        <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">Search Underground Aquarium</h1>
        <p className="mt-2 text-ocean-300">
          Help answers, fish species and care guides, classifieds, stores, forum threads, breeding guides, events, the glossary and courses, all at once. Close spellings count.
        </p>
        <div className="mt-6">
          <SiteSearch initialQuery={query} initialGroups={initial.groups} initialCorrectedTo={initial.correctedTo} />
        </div>
      </div>
    </main>
  );
}
