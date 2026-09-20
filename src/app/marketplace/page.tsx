import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Waves, Tag, ArrowRight, Plus, Fish } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { formatPrice, listingHref } from "@/lib/marketplace/listings";
import { POST_AD_PATH } from "@/lib/config";
import {
  getStateGroups,
  getRegionCounts,
  getAllRegions,
  countFor,
  stateHref,
  regionHref,
} from "@/lib/marketplace/regions";
import { CATEGORIES } from "@/lib/marketplace/categories";
import NearMeButton, {
  type LocatableRegion,
} from "@/components/marketplace/NearMeButton";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Free Aquarium Classifieds — Buy, Sell & Give Away Locally",
  description:
    "Post aquarium fish, plants, coral, tanks and gear for free. Browse local listings by state and metro area, and deal with keepers near you.",
};

export default async function MarketplacePage() {
  const [states, counts, regions, { data: newestData }] = await Promise.all([
    getStateGroups(),
    getRegionCounts(),
    getAllRegions(),
    supabasePublic
      .from("listings")
      .select("slug, title, images, price_cents, is_free, is_wanted, city, state_code")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const newest = (newestData ?? []) as {
    slug: string;
    title: string;
    images: string[] | null;
    price_cents: number | null;
    is_free: boolean | null;
    is_wanted: boolean | null;
    city: string | null;
    state_code: string | null;
  }[];

  // Anywhere with something live right now, busiest first.
  const activeRegions = regions
    .map((r) => ({ region: r, count: countFor(counts, r) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const totalListings = states.reduce((n, s) => n + s.listingCount, 0);

  // Only regions we actually have coordinates for can be matched against
  // someone's location. Until the geocoder has run, this is empty and the
  // button simply doesn't render.
  const locatable: LocatableRegion[] = regions
    .filter((r) => r.lat !== null && r.lng !== null)
    .map((r) => ({
      state_code: r.state_code,
      slug: r.slug,
      name: r.name,
      state_name: r.state_name,
      lat: r.lat as number,
      lng: r.lng as number,
    }));

  // Phones get single swipeable rows instead of walls of wrapped chips.
  const row =
    "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden";
  const chip =
    "shrink-0 rounded-full border border-ocean-800/60 bg-ocean-900/40 px-3 py-1.5 text-sm text-ocean-300 transition-colors hover:border-ocean-600 hover:text-white";

  return (
    <main className="min-h-screen px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-ocean-500">
            Free Classifieds
            {totalListings > 0 && (
              <span className="normal-case tracking-normal text-ocean-600">
                {" · "}
                {totalListings.toLocaleString()} live {totalListings === 1 ? "ad" : "ads"}
              </span>
            )}
          </p>
          <h1 className="mb-2 font-display text-3xl text-white md:text-5xl">
            Find your corner of the reef
          </h1>
          <p className="max-w-2xl text-sm text-ocean-400 sm:text-lg">
            Fish, plants, coral and gear from keepers near you. Free to post, free to browse.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6">
            <NearMeButton
              regions={locatable}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ocean-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ocean-500 disabled:opacity-60"
            />
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-ocean-100 transition-colors hover:bg-white/5"
            >
              Browse all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Categories */}
        <section className="mb-6 sm:mb-10">
          <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-ocean-500">
            <Tag className="h-3.5 w-3.5" />
            Categories
          </p>
          <div className={row}>
            {CATEGORIES.map((c) => (
              <Link key={c.key} href={`/listings?category=${c.key}`} className={chip}>
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Where things are happening now */}
        {activeRegions.length > 0 && (
          <section className="mb-6 sm:mb-10">
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-ocean-500">
              <Waves className="h-3.5 w-3.5" />
              Active areas
            </p>
            <div className={row}>
              {activeRegions.map(({ region, count }) => (
                <Link key={region.id} href={regionHref(region)} className={`${chip} inline-flex items-center gap-2`}>
                  {region.name}
                  <span className="text-xs text-ocean-500">{region.state_code}</span>
                  <span className="rounded-full bg-ocean-700/50 px-1.5 text-[11px] text-ocean-100">{count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* The actual ads, which is what people came for */}
        <section className="mb-10 sm:mb-14">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl text-white">Just posted</h2>
            {newest.length > 0 && (
              <Link href="/listings" className="text-sm text-ocean-400 hover:text-white">
                See all
              </Link>
            )}
          </div>
          {newest.length === 0 ? (
            <Link
              href={POST_AD_PATH}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-ocean-700/60 p-5 text-ocean-300 hover:border-ocean-500"
            >
              <Plus className="h-5 w-5" />
              Nothing up right now. Post the first ad, it&apos;s free.
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {newest.map((l) => (
                <Link
                  key={l.slug}
                  href={listingHref(l.slug)}
                  className="group overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40 transition-colors hover:border-ocean-600"
                >
                  <div className="flex aspect-square items-center justify-center bg-ocean-950">
                    {l.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Fish className="h-8 w-8 text-ocean-700" />
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-semibold text-white">
                      {l.is_wanted ? "Wanted" : l.is_free ? "Free" : formatPrice(l.price_cents)}
                    </p>
                    <p className="truncate text-sm text-ocean-200">{l.title}</p>
                    <p className="truncate text-xs text-ocean-500">
                      {[l.city, l.state_code].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Every state */}
        <section>
          <h2 className="flex items-center gap-2 font-display text-xl text-white mb-1">
            <MapPin className="w-5 h-5 text-ocean-400" />
            Pick your state
          </h2>
          <p className="text-sm text-ocean-400 mb-4">
            Then choose the metro area closest to you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {states.map((s) => (
              <Link
                key={s.code}
                href={stateHref(s.code)}
                className="group flex items-center justify-between gap-3 rounded-xl border border-ocean-800/50 bg-ocean-900/40 px-4 py-3 hover:bg-ocean-800/50 hover:border-ocean-600/70 transition-colors"
              >
                <span className="text-ocean-100 group-hover:text-white transition-colors">
                  {s.name}
                </span>
                {s.listingCount > 0 && (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    {s.listingCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <p className="text-xs text-ocean-600 mt-6">
            A green number is how many ads are live in that state right now.
          </p>
        </section>
      </div>
    </main>
  );
}
