import type { Metadata } from "next";
import SiteSearch from "@/components/search/SiteSearch";
import { siteSearch } from "@/lib/search/site";

// Results pages are for people, not Google: every one would be thin and near-duplicate.
export const metadata: Metadata = {
  title: "Search",
  description: "Search Underground Aquarium: help answers, classifieds, fish species, stores, forums, events and more.",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  // Render results on the server too, so a shared /search?q= link loads with answers.
  const groups = query.length >= 2 ? await siteSearch(query, 6).catch(() => []) : [];

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">Search</p>
        <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">Search Underground Aquarium</h1>
        <p className="mt-2 text-ocean-300">
          Help answers, classifieds, fish species, stores, forum threads, events, the glossary and courses, all at once.
        </p>
        <div className="mt-6">
          <SiteSearch initialQuery={query} initialGroups={groups} />
        </div>
      </div>
    </main>
  );
}
