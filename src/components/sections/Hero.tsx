import Link from "next/link";
import { ArrowRight, Crosshair, Fish, Flower2, Gift, MapPin, Package, Plus, Search, Snail, Sprout } from "lucide-react";
import { POST_AD_PATH } from "@/lib/config";
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
 * The front door leads with finding a local fish store, since that's what
 * most people arrive looking for. The search is a plain form, so it works
 * the instant the page loads, before any JavaScript.
 */
export default function Hero({
  liveListings,
}: {
  locatable?: LocatableRegion[];
  liveListings: number;
}) {
  return (
    <section className="relative pt-24 pb-14 sm:pt-32 sm:pb-20">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[440px] w-[760px] max-w-full -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse, rgba(18,100,160,0.25) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 text-center sm:px-6">
        <h1 className="glow-text mb-4 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[1.08] text-white">
          Find your nearest
          <br />
          <span className="text-ocean-300">fish store</span>
        </h1>

        <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-ocean-300/85 sm:text-lg">
          Local aquarium shops, what they carry, and how to get there.
        </p>

        {/* The shop finder */}
        <form action="/stores" method="get" role="search" className="mx-auto max-w-2xl">
          <label htmlFor="hero-store-search" className="sr-only">
            Search fish stores by city, state or name
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-ocean-600/60 bg-ocean-900/80 p-2 shadow-2xl shadow-ocean-950/60 ring-1 ring-white/5 backdrop-blur transition-colors focus-within:border-ocean-400">
            <MapPin className="ml-2 h-5 w-5 shrink-0 text-ocean-400" />
            <input
              id="hero-store-search"
              name="q"
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="City, state or shop name"
              className="min-w-0 flex-1 bg-transparent py-3 text-base text-white placeholder-ocean-500 outline-none sm:text-lg"
            />
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-ocean-500 px-4 font-medium text-white shadow-lg shadow-ocean-500/25 transition-colors hover:bg-ocean-400 sm:px-6"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Find shops</span>
            </button>
          </div>
        </form>

        <Link
          href="/stores?near=1"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ocean-300 transition-colors hover:text-white"
        >
          <Crosshair className="h-4 w-4" /> Use my location
        </Link>

        {/* The classifieds, second */}
        <div className="mx-auto mt-14 max-w-2xl border-t border-ocean-800/50 pt-8">
          <p className="mb-4 text-sm text-ocean-400">
            Or buy and sell locally in the free classifieds
            {liveListings > 0 && (
              <span className="text-ocean-500">
                {" "}
                · {liveListings.toLocaleString()} live {liveListings === 1 ? "listing" : "listings"}
              </span>
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CHIPS.map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border border-ocean-800/70 bg-ocean-900/40 px-3.5 py-2 text-sm text-ocean-200 transition-colors hover:border-ocean-500 hover:text-white"
              >
                <Icon className="h-4 w-4 text-ocean-400" />
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-center gap-5 text-sm">
            <Link href={POST_AD_PATH} className="inline-flex items-center gap-1.5 text-ocean-300 hover:text-white">
              <Plus className="h-4 w-4" /> Sell something
            </Link>
            <Link href="/listings" className="group inline-flex items-center gap-1.5 text-ocean-300 hover:text-white">
              Browse all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
