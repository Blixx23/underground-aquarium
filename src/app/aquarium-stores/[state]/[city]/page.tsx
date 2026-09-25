import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Fish, MapPin, Plus } from "lucide-react";
import PlaceStoreCard from "@/components/stores/PlaceStoreCard";
import { POST_AD_PATH } from "@/lib/config";
import {
  getPlaceStores,
  groupCities,
  milesBetween,
  stateName,
  statePath,
  cityPath,
  STORES_BASE,
  type PlaceStore,
  type City,
} from "@/lib/stores/places";

export const revalidate = 3600;

const site = "https://www.undergroundaquarium.com";

/** Specialty sections: the "saltwater store near me" style searches. */
const SPECIALTIES: { tag: string; heading: (city: string) => string }[] = [
  { tag: "saltwater", heading: (c) => `Saltwater fish and coral stores in and near ${c}` },
  { tag: "freshwater", heading: (c) => `Freshwater tropical fish stores in and near ${c}` },
  { tag: "plants", heading: (c) => `Where to buy aquarium plants in and near ${c}` },
  { tag: "shrimp", heading: (c) => `Freshwater shrimp in and near ${c}` },
  { tag: "pond", heading: (c) => `Pond fish and koi stores in and near ${c}` },
];

function hasTag(s: PlaceStore, tag: string) {
  return (s.tags ?? []).some((t) => t.toLowerCase() === tag);
}
const NEARBY_MILES = 30;

async function load(stateParam: string, cityParam: string) {
  const all = await getPlaceStores();
  const cities = groupCities(all);
  const city = cities.get(`${stateParam.toUpperCase()}/${cityParam.toLowerCase()}`);
  if (!city) return null;

  let nearbyShops: { s: PlaceStore; d: number }[] = [];
  let nearbyCities: { c: City; d: number }[] = [];
  if (city.lat != null && city.lng != null) {
    const here = new Set(city.stores.map((s) => s.id));
    nearbyShops = all
      .filter((s) => !here.has(s.id) && s.lat != null && s.lng != null)
      .map((s) => ({ s, d: milesBetween(city.lat!, city.lng!, s.lat!, s.lng!) }))
      .filter((x) => x.d <= NEARBY_MILES)
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);
    nearbyCities = [...cities.values()]
      .filter((c) => c !== city && c.lat != null && c.lng != null)
      .map((c) => ({ c, d: milesBetween(city.lat!, city.lng!, c.lat!, c.lng!) }))
      .filter((x) => x.d <= 75)
      .sort((a, b) => a.d - b.d)
      .slice(0, 12);
  }
  return { city, nearbyShops, nearbyCities };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state, city } = await params;
  const d = await load(state, city);
  if (!d) return { title: "Aquarium stores" };
  const { city: c } = d;
  const n = c.stores.length;
  const names = c.stores.slice(0, 3).map((s) => s.name).join(", ");
  return {
    title: `Aquarium Stores in ${c.name}, ${c.state} (${n} Fish ${n === 1 ? "Shop" : "Shops"})`,
    description: `${n} aquarium and tropical fish ${n === 1 ? "store" : "stores"} in ${c.name}, ${stateName(
      c.state
    )}: ${names}. Addresses, phone numbers, hours and reviews, plus shops nearby.`,
    alternates: { canonical: cityPath(c.state, c.name) },
  };
}

export default async function CityPage({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state, city } = await params;
  const d = await load(state, city);
  if (!d) notFound();
  const { city: c, nearbyShops, nearbyCities } = d;
  const n = c.stores.length;
  const st = stateName(c.state);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Fish stores", item: `${site}${STORES_BASE}` },
        { "@type": "ListItem", position: 2, name: st, item: `${site}${statePath(c.state)}` },
        { "@type": "ListItem", position: 3, name: c.name, item: `${site}${cityPath(c.state, c.name)}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Aquarium stores in ${c.name}, ${c.state}`,
      itemListElement: c.stores.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${site}/stores/${s.slug}`,
        name: s.name,
      })),
    },
  ];

  return (
    <main className="px-5 pb-24 pt-24 sm:px-6 sm:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm text-ocean-400">
          <Link href={STORES_BASE} className="hover:text-white">
            Fish stores
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ocean-600" />
          <Link href={statePath(c.state)} className="hover:text-white">
            {st}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ocean-600" />
          <span className="text-ocean-200">{c.name}</span>
        </nav>

        <h1 className="mb-2 font-display text-3xl leading-tight text-white sm:text-4xl">
          Aquarium stores in {c.name}, {c.state}
        </h1>
        <p className="mb-8 max-w-2xl text-ocean-300">
          {n === 1
            ? `There's 1 independent aquarium and tropical fish store in ${c.name}`
            : `There are ${n} independent aquarium and tropical fish stores in ${c.name}`}
          {nearbyShops.length > 0 ? `, and ${nearbyShops.length} more within ${NEARBY_MILES} miles` : ""}. Tap a
          shop for directions, hours and reviews.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {c.stores.map((s) => (
            <PlaceStoreCard key={s.id} s={s} />
          ))}
        </div>

        {nearbyShops.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 font-display text-2xl text-white">More fish stores near {c.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {nearbyShops.map(({ s, d: dist }) => (
                <PlaceStoreCard key={s.id} s={s} distance={dist} />
              ))}
            </div>
          </section>
        )}

        {(() => {
          const pool: { s: PlaceStore; d: number | null }[] = [
            ...c.stores.map((s) => ({ s, d: null as number | null })),
            ...nearbyShops.map(({ s, d: dist }) => ({ s, d: dist as number | null })),
          ];
          const groups = SPECIALTIES.map((sp) => ({ sp, shops: pool.filter((x) => hasTag(x.s, sp.tag)) })).filter(
            (g) => g.shops.length > 0
          );
          return (
            <section className="mt-12">
              <h2 className="mb-4 font-display text-2xl text-white">Good to know</h2>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="font-medium text-white">How many aquarium stores are in {c.name}?</dt>
                  <dd className="mt-1 text-ocean-300">
                    We list {n} independent aquarium and tropical fish {n === 1 ? "store" : "stores"} in {c.name}, {st}
                    {nearbyShops.length > 0
                      ? `, plus ${nearbyShops.length} more within ${NEARBY_MILES} miles. The closest is ${nearbyShops[0].s.name}${
                          nearbyShops[0].s.city ? ` in ${nearbyShops[0].s.city}` : ""
                        }, about ${Math.round(nearbyShops[0].d)} miles away`
                      : ""}
                    .
                  </dd>
                </div>
                {groups.map(({ sp, shops }) => (
                  <div key={sp.tag}>
                    <dt className="font-medium text-white">{sp.heading(c.name)}</dt>
                    <dd className="mt-1 text-ocean-300">
                      {shops.slice(0, 8).map(({ s, d: dist }, i) => (
                        <span key={s.id}>
                          {i > 0 ? ", " : ""}
                          <Link
                            href={`/stores/${s.slug}`}
                            className="text-ocean-100 underline decoration-ocean-600 underline-offset-2 hover:text-white"
                          >
                            {s.name}
                          </Link>
                          {dist != null ? ` (${Math.round(dist)} mi${s.city ? `, ${s.city}` : ""})` : ""}
                        </span>
                      ))}
                      .
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="font-medium text-white">Can I buy fish from hobbyists in {c.name}?</dt>
                  <dd className="mt-1 text-ocean-300">
                    Yes. Local keepers sell fry, shrimp, plant trimmings and used tanks on the{" "}
                    <Link href="/marketplace" className="text-ocean-100 underline decoration-ocean-600 underline-offset-2 hover:text-white">
                      Underground Aquarium marketplace
                    </Link>
                    , free to browse and free to post.
                  </dd>
                </div>
              </dl>
            </section>
          );
        })()}

        {/* Buy from a neighbor, not just a shop */}
        <section className="mt-12 overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-ocean-900/50 to-ocean-950 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/40">
              <Fish className="h-6 w-6 text-emerald-300" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-white">Fish for sale from keepers near {c.name}</h2>
              <p className="text-sm text-emerald-50/75">
                Local hobbyists sell fry, shrimp, plants and used tanks here. Live fish welcome, free to post.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/marketplace"
                className="inline-flex h-10 items-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
              >
                Browse
              </Link>
              <Link
                href={POST_AD_PATH}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-emerald-400/30 px-4 text-sm text-emerald-100 hover:bg-emerald-400/10"
              >
                <Plus className="h-4 w-4" /> Sell
              </Link>
            </div>
          </div>
        </section>

        {nearbyCities.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ocean-400">Nearby cities</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyCities.map(({ c: nc, d: dist }) => (
                <Link
                  key={`${nc.state}/${nc.slug}`}
                  href={cityPath(nc.state, nc.name)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ocean-800/60 bg-ocean-900/40 px-3 py-1.5 text-sm text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white"
                >
                  <MapPin className="h-3 w-3 text-ocean-500" />
                  {nc.name}
                  {nc.state !== c.state ? `, ${nc.state}` : ""}
                  <span className="text-xs text-ocean-500">{Math.round(dist)} mi</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-12 text-sm text-ocean-500">
          Own a shop in {c.name} that&apos;s missing or out of date?{" "}
          <Link href="/stores" className="text-ocean-300 underline underline-offset-2 hover:text-white">
            Add or claim it free
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
