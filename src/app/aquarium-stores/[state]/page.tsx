import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import PlaceStoreCard from "@/components/stores/PlaceStoreCard";
import {
  getPlaceStores,
  groupCities,
  stateName,
  statePath,
  cityPath,
  STATE_NAMES,
  STORES_BASE,
} from "@/lib/stores/places";

export const revalidate = 3600;

const site = "https://www.undergroundaquarium.com";

async function load(stateParam: string) {
  const code = stateParam.toUpperCase();
  if (!STATE_NAMES[code]) return null;
  const stores = (await getPlaceStores()).filter((s) => s.state === code);
  if (stores.length === 0) return null;
  const cities = [...groupCities(stores).values()].sort(
    (a, b) => b.stores.length - a.stores.length || a.name.localeCompare(b.name)
  );
  return { code, stores, cities };
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  const d = await load(state);
  if (!d) return { title: "Aquarium stores" };
  const name = stateName(d.code);
  const top = d.cities.slice(0, 3).map((c) => c.name).join(", ");
  return {
    title: `Aquarium & Tropical Fish Stores in ${name} (${d.stores.length} Shops)`,
    description: `${d.stores.length} independent aquarium and fish stores in ${name}${
      top ? `, including shops in ${top}` : ""
    }. Addresses, phone numbers and reviews.`,
    alternates: { canonical: statePath(d.code) },
  };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const d = await load(state);
  if (!d) notFound();
  const name = stateName(d.code);

  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Fish stores", item: `${site}${STORES_BASE}` },
      { "@type": "ListItem", position: 2, name, item: `${site}${statePath(d.code)}` },
    ],
  };

  return (
    <main className="px-5 pb-24 pt-24 sm:px-6 sm:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <div className="mx-auto max-w-5xl">
        <Link href={STORES_BASE} className="mb-5 inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Find a fish store
        </Link>
        <h1 className="mb-2 font-display text-3xl leading-tight text-white sm:text-4xl">
          Aquarium stores in {name}
        </h1>
        <p className="mb-8 max-w-2xl text-ocean-300">
          {d.stores.length} independent fish and aquarium {d.stores.length === 1 ? "shop" : "shops"} across{" "}
          {d.cities.length} {d.cities.length === 1 ? "city" : "cities"} in {name}. Pick a city to see every shop
          there and nearby.
        </p>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ocean-400">Cities</h2>
        <div className="mb-12 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {[...d.cities]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <Link
                key={c.slug}
                href={cityPath(d.code, c.name)}
                className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ocean-200 transition-colors hover:bg-ocean-900/60 hover:text-white"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0 text-ocean-600" />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="text-xs text-ocean-500">{c.stores.length}</span>
              </Link>
            ))}
        </div>

        {d.cities.slice(0, 8).map((c) => (
          <section key={c.slug} className="mb-10">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl text-white">
                Fish stores in {c.name}
              </h2>
              <Link href={cityPath(d.code, c.name)} className="shrink-0 text-sm text-ocean-400 hover:text-white">
                See {c.name} →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.stores.slice(0, 4).map((s) => (
                <PlaceStoreCard key={s.id} s={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
