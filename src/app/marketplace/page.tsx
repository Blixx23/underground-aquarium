import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Waves, Tag } from "lucide-react";
import {
  getStateGroups,
  getRegionCounts,
  getAllRegions,
  countFor,
  stateHref,
  regionHref,
} from "@/lib/marketplace/regions";
import { CATEGORIES } from "@/lib/marketplace/categories";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Free Aquarium Classifieds — Buy, Sell & Give Away Locally",
  description:
    "Post aquarium fish, plants, coral, tanks and gear for free. Browse local listings by state and metro area, and deal with keepers near you.",
};

export default async function MarketplacePage() {
  const [states, counts, regions] = await Promise.all([
    getStateGroups(),
    getRegionCounts(),
    getAllRegions(),
  ]);

  // Anywhere with something live right now, busiest first.
  const activeRegions = regions
    .map((r) => ({ region: r, count: countFor(counts, r) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const totalListings = states.reduce((n, s) => n + s.listingCount, 0);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
            Free Classifieds
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white mb-4">
            Find your corner of the reef
          </h1>
          <p className="text-ocean-400 max-w-2xl text-lg">
            Fish, plants, coral, tanks and gear from keepers near you. Posting is
            free, browsing is free, and you deal with the other hobbyist
            directly.
          </p>
          {totalListings > 0 && (
            <p className="text-sm text-ocean-500 mt-4">
              {totalListings.toLocaleString()} live{" "}
              {totalListings === 1 ? "listing" : "listings"} across{" "}
              {activeRegions.length}{" "}
              {activeRegions.length === 1 ? "area" : "areas"}
            </p>
          )}
        </div>

        {/* Where things are happening now */}
        {activeRegions.length > 0 && (
          <section className="mb-14">
            <h2 className="flex items-center gap-2 font-display text-xl text-white mb-5">
              <Waves className="w-5 h-5 text-ocean-400" />
              Active right now
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {activeRegions.map(({ region, count }) => (
                <Link
                  key={region.id}
                  href={regionHref(region)}
                  className="inline-flex items-center gap-2 rounded-full bg-ocean-900/60 border border-ocean-800/60 px-4 py-2.5 text-sm text-ocean-200 hover:text-white hover:border-ocean-600/70 transition-colors"
                >
                  {region.name}
                  <span className="text-xs text-ocean-500">
                    {region.state_code}
                  </span>
                  <span className="rounded-full bg-ocean-700/50 px-2 py-0.5 text-[11px] text-ocean-100">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="mb-14">
          <h2 className="flex items-center gap-2 font-display text-xl text-white mb-5">
            <Tag className="w-5 h-5 text-ocean-400" />
            What people post here
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <div
                key={c.key}
                className="rounded-2xl bg-ocean-900/40 border border-ocean-800/50 px-5 py-4"
              >
                <p className="text-ocean-100 font-medium mb-1">{c.label}</p>
                <p className="text-sm text-ocean-500">{c.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Every state */}
        <section>
          <h2 className="flex items-center gap-2 font-display text-xl text-white mb-2">
            <MapPin className="w-5 h-5 text-ocean-400" />
            Pick your state
          </h2>
          <p className="text-sm text-ocean-500 mb-6">
            Then choose the metro area closest to you.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1">
            {states.map((s) => (
              <Link
                key={s.code}
                href={stateHref(s.code)}
                className="group flex items-baseline justify-between gap-2 py-2 border-b border-ocean-900/70 hover:border-ocean-700 transition-colors"
              >
                <span className="text-ocean-300 group-hover:text-white transition-colors">
                  {s.name}
                </span>
                {s.listingCount > 0 ? (
                  <span className="shrink-0 text-xs text-emerald-400">
                    {s.listingCount}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-ocean-700">
                    {s.regions.length}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <p className="text-xs text-ocean-600 mt-6">
            Green numbers are live listings. Grey numbers are how many metro
            areas that state is split into.
          </p>
        </section>
      </div>
    </main>
  );
}
