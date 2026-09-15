import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import {
  getStateGroup,
  getRegionCounts,
  countFor,
  regionHref,
} from "@/lib/marketplace/regions";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const group = await getStateGroup(state);
  if (!group) return { title: "Area not found" };

  return {
    title: `${group.name} Aquarium Classifieds — Free Local Listings`,
    description: `Free aquarium classifieds across ${group.name}. Browse fish, plants, coral, tanks and gear by metro area, or post your own listing for free.`,
    alternates: { canonical: `/marketplace/${group.code.toLowerCase()}` },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const group = await getStateGroup(state);
  if (!group) notFound();

  const counts = await getRegionCounts();
  const flagship = group.regions.find((r) => r.is_primary);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          All states
        </Link>

        <div className="mb-10">
          <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
            {group.code}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white mb-3">
            {group.name}
          </h1>
          <p className="text-ocean-400">
            {group.regions.length}{" "}
            {group.regions.length === 1 ? "area" : "areas"}
            {group.listingCount > 0 && (
              <>
                {" · "}
                <span className="text-emerald-400">
                  {group.listingCount} live{" "}
                  {group.listingCount === 1 ? "listing" : "listings"}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {group.regions.map((r) => {
            const count = countFor(counts, r);
            return (
              <Link
                key={r.id}
                href={regionHref(r)}
                className="group flex items-center justify-between gap-3 rounded-2xl bg-ocean-900/50 border border-ocean-800/60 px-5 py-4 hover:border-ocean-600/70 hover:bg-ocean-900/70 transition-all"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 shrink-0 text-ocean-600 group-hover:text-ocean-400 transition-colors" />
                  <span className="truncate text-ocean-200 group-hover:text-white transition-colors">
                    {r.name}
                  </span>
                  {r.is_primary && flagship && (
                    <Star className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
                  )}
                </span>
                {count > 0 ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs text-emerald-300">
                    {count}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-ocean-700">empty</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
