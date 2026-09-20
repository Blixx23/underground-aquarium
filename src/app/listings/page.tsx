import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { LISTING_COLUMNS, type Listing } from "@/lib/marketplace/listings";
import { CATEGORIES } from "@/lib/marketplace/categories";
import ListingsBrowser from "@/components/marketplace/ListingsBrowser";
import { POST_AD_PATH } from "@/lib/config";

export const revalidate = 60;

type Props = { searchParams: Promise<{ category?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category } = await searchParams;
  const c = CATEGORIES.find((x) => x.key === category);
  return {
    title: c ? `${c.label} for sale nationwide` : "Every aquarium listing, nationwide",
    description: "Search every free aquarium classified on Underground Aquarium, across every state.",
  };
}

/** Every live ad in every area, searchable and filterable by category. */
export default async function AllListingsPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const initial = CATEGORIES.some((c) => c.key === category) ? (category as string) : "all";

  const { data } = await supabasePublic
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("bumped_at", { ascending: false })
    .limit(500);
  const listings = (data ?? []) as unknown as Listing[];

  return (
    <main className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/marketplace"
          className="mb-8 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Classifieds by area
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">Nationwide</p>
            <h1 className="mb-2 font-display text-4xl text-white md:text-5xl">Every listing</h1>
            <p className="text-ocean-400">
              Everything live right now, in every area. Most sellers want local pickup, so check the city.
            </p>
          </div>
          <Link
            href={POST_AD_PATH}
            className="inline-flex items-center gap-2 rounded-xl bg-ocean-600 px-5 py-3 font-medium text-white transition-colors hover:bg-ocean-500"
          >
            <Plus className="h-4 w-4" />
            Post free ad
          </Link>
        </div>

        <ListingsBrowser key={initial} listings={listings} regionName="all areas" initialCategory={initial} />
      </div>
    </main>
  );
}
