import Link from "next/link";
import { ArrowRight, Fish, Flower2, Gift, LocateFixed, MapPin, Package, Plus, Search, Snail, Sprout } from "lucide-react";
import { POST_AD_PATH } from "@/lib/config";
import { supabasePublic } from "@/lib/supabase/public";
import type { LocatableRegion } from "@/components/marketplace/NearMeButton";

/** The classifieds, as one quiet row under the shop finder. */
const CHIPS = [
  { label: "Live fish", href: "/listings?category=livestock-freshwater", Icon: Fish },
  { label: "Shrimp & snails", href: "/listings?category=livestock-inverts", Icon: Snail },
  { label: "Plants", href: "/listings?category=plants", Icon: Sprout },
  { label: "Coral", href: "/listings?category=livestock-saltwater", Icon: Flower2 },
  { label: "Tanks & gear", href: "/listings?category=tanks", Icon: Package },
  { label: "Free stuff", href: "/listings?category=free", Icon: Gift },
];

/**
 * Shop count and the cities with the most shops, straight from the directory.
 * Supabase returns at most 1000 rows per request no matter what .limit() says,
 * so the directory is read in pages of 1000 until a short page comes back.
 */
const PAGE = 1000;

async function storeStats() {
  const rows: { city: string | null; state: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("fish_stores")
      .select("city, state")
      .eq("status", "published")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...(data as { city: string | null; state: string | null }[]));
    if (data.length < PAGE) break;
  }

  // Count by city AND state so two Springfields don't merge into one.
  const byCity = new Map<string, { city: string; count: number }>();
  for (const r of rows) {
    const city = r.city?.trim();
    if (!city) continue;
    const key = `${city.toLowerCase()}|${(r.state ?? "").toUpperCase()}`;
    const entry = byCity.get(key) ?? { city, count: 0 };
    entry.count += 1;
    byCity.set(key, entry);
  }
  const topCities = [...byCity.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((e) => e.city);
  return { total: rows.length, topCities };
}

/**
 * The directory keeps growing, so the badge shows a floor with a plus
 * (1,517 reads "1,500+") instead of an exact number that goes stale.
 */
function roundedDown(n: number): string {
  if (n < 100) return n.toLocaleString();
  return `${(Math.floor(n / 100) * 100).toLocaleString()}+`;
}

/**
 * The front door leads with finding a local fish store, since that's what
 * most people arrive looking for. The search is a plain form, so it works
 * the instant the page loads, before any JavaScript.
 */
export default async function Hero({
  liveListings,
}: {
  locatable?: LocatableRegion[];
  liveListings: number;
}) {
  const { total, topCities } = await storeStats();

  return (
    <section className="relative overflow-hidden pt-28 pb-16 font-sans sm:pt-36 sm:pb-24">
      {/* Soft light from above */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] max-w-[140%] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(56,189,248,0.18), rgba(18,100,160,0.10) 45%, transparent 75%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 text-center sm:px-6">
        {total > 0 && (
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-ocean-200 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {roundedDown(total)} independent fish stores
          </p>
        )}

        <h1 className="text-[clamp(2.4rem,7vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.035em] text-white">
          Find your local
          <br />
          <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-emerald-200 bg-clip-text text-transparent">
            fish store.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-ocean-300 sm:text-lg">
          Hours, what they stock, reviews, and directions. No chains.
        </p>

        {/* The shop finder */}
        <form action="/stores" method="get" role="search" className="mx-auto mt-9 max-w-xl">
          <label htmlFor="hero-store-search" className="sr-only">
            Search fish stores by city, state or name
          </label>
          <div className="rounded-2xl bg-gradient-to-r from-sky-400/40 via-cyan-300/20 to-emerald-300/40 p-px shadow-[0_20px_60px_-15px_rgba(14,165,233,0.35)] transition-shadow focus-within:shadow-[0_20px_70px_-10px_rgba(14,165,233,0.55)]">
            <div className="flex items-center gap-2 rounded-[15px] bg-ocean-950/95 p-1.5 backdrop-blur-xl">
              <Search className="ml-3 h-5 w-5 shrink-0 text-ocean-400" />
              <input
                id="hero-store-search"
                name="q"
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="City, state or shop name"
                className="min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 py-3 text-[16px] text-white shadow-none outline-none ring-0 placeholder:text-ocean-500 focus:ring-0 sm:text-[17px]"
              />
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 px-4 text-[15px] font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:from-sky-300 hover:to-sky-500 active:scale-[0.98] sm:px-5"
              >
                <span>Search</span>
                <ArrowRight className="hidden h-4 w-4 sm:block" />
              </button>
            </div>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/stores?near=1"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ocean-950 transition hover:bg-sky-100"
          >
            <LocateFixed className="h-3.5 w-3.5" /> Near me
          </Link>
          {topCities.map((city) => (
            <Link
              key={city}
              href={`/stores?q=${encodeURIComponent(city)}`}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-ocean-200 transition hover:border-white/25 hover:text-white"
            >
              <MapPin className="h-3 w-3 text-ocean-400" />
              {city}
            </Link>
          ))}
        </div>

        {/* The classifieds, second */}
        <div className="mx-auto mt-20 max-w-2xl">
          <div className="mb-5 flex items-center gap-4">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-ocean-400">
              Free local classifieds
            </p>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {CHIPS.map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-ocean-100 transition hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-white"
              >
                <Icon className="h-4 w-4 text-sky-300/80" />
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-center gap-5 text-sm">
            <Link href={POST_AD_PATH} className="inline-flex items-center gap-1.5 font-medium text-ocean-200 hover:text-white">
              <Plus className="h-4 w-4" /> Sell something
            </Link>
            <Link href="/listings" className="group inline-flex items-center gap-1.5 font-medium text-ocean-200 hover:text-white">
              Browse all{liveListings > 0 ? ` ${liveListings.toLocaleString()}` : ""}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
