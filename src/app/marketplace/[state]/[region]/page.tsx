import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { getRegion, getStateGroup, regionHref } from "@/lib/marketplace/regions";
import { LISTING_COLUMNS, type Listing } from "@/lib/marketplace/listings";
import ListingsBrowser from "@/components/marketplace/ListingsBrowser";
import { POST_AD_PATH } from "@/lib/config";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; region: string }>;
}): Promise<Metadata> {
  const { state, region } = await params;
  const r = await getRegion(state, region);
  if (!r) return { title: "Area not found" };

  return {
    title: `${r.name} Aquarium Classifieds — Free Fish, Plants & Gear`,
    description: `Free local aquarium classifieds in ${r.name}, ${r.state_name}. Buy, sell and give away fish, coral, plants, tanks and equipment with hobbyists nearby.`,
    alternates: { canonical: regionHref(r) },
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ state: string; region: string }>;
}) {
  const { state, region } = await params;
  const r = await getRegion(state, region);
  if (!r) notFound();

  const [{ data }, stateGroup] = await Promise.all([
    supabasePublic
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("state_code", r.state_code)
      .eq("region_slug", r.slug)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("bumped_at", { ascending: false })
      .limit(500),
    getStateGroup(state),
  ]);

  const listings = (data ?? []) as unknown as Listing[];

  // A few other areas in the same state, so an empty region isn't a dead end.
  const siblings = (stateGroup?.regions ?? [])
    .filter((s) => s.id !== r.id)
    .slice(0, 8);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href={`/marketplace/${r.state_code.toLowerCase()}`}
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          All of {r.state_name}
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
              {r.state_name}
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-white mb-2">
              {r.name}
            </h1>
            <p className="text-ocean-400">
              Free aquarium classifieds. Meet up locally, no fees, no middleman.
            </p>
          </div>
          <Link
            href={POST_AD_PATH}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post free ad
          </Link>
        </div>

        <ListingsBrowser listings={listings} regionName={r.name} />

        {siblings.length > 0 && (
          <section className="mt-16 pt-8 border-t border-ocean-900/70">
            <p className="text-sm text-ocean-500 mb-4">
              Other areas in {r.state_name}
            </p>
            <div className="flex flex-wrap gap-2">
              {siblings.map((s) => (
                <Link
                  key={s.id}
                  href={regionHref(s)}
                  className="rounded-full bg-ocean-900/50 border border-ocean-800/60 px-4 py-2 text-sm text-ocean-300 hover:text-white hover:border-ocean-600/70 transition-colors"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
