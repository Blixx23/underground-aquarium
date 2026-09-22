import type { Metadata } from "next";
import Link from "next/link";
import { Fish } from "lucide-react";
import StoreFinder, { type FinderCity, type FinderShop } from "./StoreFinder";
import {
  getPlaceStores,
  groupCities,
  stateName,
  statePath,
  cityPath,
  STATE_NAMES,
} from "@/lib/stores/places";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Find an Aquarium Store Near You",
  description:
    "Search independent aquarium and tropical fish stores across the US by city, state or name. Addresses, phone numbers, hours and reviews.",
  alternates: { canonical: "/aquarium-stores" },
};

export default async function FindAStorePage() {
  const stores = await getPlaceStores();
  const cities = [...groupCities(stores).values()];

  const finderCities: FinderCity[] = cities.map((c) => ({
    label: `${c.name}, ${c.state}`,
    href: cityPath(c.state, c.name),
    count: c.stores.length,
    lat: c.lat,
    lng: c.lng,
  }));
  const finderShops: FinderShop[] = stores
    .filter((s) => s.city && s.state)
    .map((s) => ({ label: s.name, sub: `${s.city}, ${s.state}`, href: `/stores/${s.slug}` }));

  const byState = new Map<string, number>();
  for (const s of stores) if (s.state && STATE_NAMES[s.state]) byState.set(s.state, (byState.get(s.state) ?? 0) + 1);
  const states = [...byState.entries()].sort((a, b) => stateName(a[0]).localeCompare(stateName(b[0])));
  const popular = [...cities].sort((a, b) => b.stores.length - a.stores.length).slice(0, 12);

  return (
    <main className="px-5 pb-24 pt-28 sm:px-6 sm:pt-36">
      {/* The search, and nothing else above the fold */}
      <section className="relative flex min-h-[52vh] flex-col items-center justify-center text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] max-w-full -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(ellipse, rgba(18,100,160,0.25) 0%, transparent 70%)" }}
        />
        <div className="relative w-full">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean-800/60 ring-1 ring-ocean-500/40">
            <Fish className="h-7 w-7 text-ocean-200" />
          </span>
          <h1 className="glow-text mb-3 font-display text-[clamp(2rem,6vw,3.25rem)] leading-tight text-white">
            Find a fish store
          </h1>
          <p className="mx-auto mb-8 max-w-md text-ocean-300">
            {stores.length.toLocaleString()} independent aquarium shops in {states.length} states.
          </p>
          <StoreFinder cities={finderCities} shops={finderShops} />
        </div>
      </section>

      {/* Crawlable paths into every city, for people and for search engines */}
      <section className="mx-auto mt-16 max-w-5xl">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ocean-400">Popular cities</h2>
        <div className="mb-10 flex flex-wrap gap-2">
          {popular.map((c) => (
            <Link
              key={`${c.state}/${c.slug}`}
              href={cityPath(c.state, c.name)}
              className="rounded-full border border-ocean-800/60 bg-ocean-900/40 px-3.5 py-1.5 text-sm text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white"
            >
              {c.name}, {c.state} <span className="text-ocean-500">{c.stores.length}</span>
            </Link>
          ))}
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ocean-400">Browse by state</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {states.map(([code, n]) => (
            <Link
              key={code}
              href={statePath(code)}
              className="flex items-baseline justify-between rounded-lg px-2 py-1.5 text-sm text-ocean-200 transition-colors hover:bg-ocean-900/60 hover:text-white"
            >
              <span>{stateName(code)}</span>
              <span className="text-xs text-ocean-500">{n}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
