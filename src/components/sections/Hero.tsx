import Link from "next/link";
import {
  Plus,
  ArrowRight,
  Fish,
  Snail,
  Sprout,
  Flower2,
  Package,
  Gift,
  ArrowLeftRight,
  MapPin,
  HandCoins,
} from "lucide-react";
import { POST_AD_PATH } from "@/lib/config";
import NearMeButton, { type LocatableRegion } from "@/components/marketplace/NearMeButton";

// One shape for every button so the row can't come out ragged at any width.
const BTN =
  "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl px-6 font-medium transition-colors sm:w-auto";
const BTN_PRIMARY = `${BTN} bg-ocean-500 text-white shadow-lg shadow-ocean-500/20 hover:bg-ocean-400`;
const BTN_SECONDARY = `${BTN} border border-ocean-700/60 bg-ocean-900/60 text-ocean-100 hover:border-ocean-500 hover:text-white`;

/** The things people actually come to buy, as big tappable tiles. */
const TILES = [
  { label: "Live fish", href: "/listings?category=livestock-freshwater", Icon: Fish, tone: "text-cyan-300 bg-cyan-400/10 border-cyan-400/25" },
  { label: "Shrimp & snails", href: "/listings?category=livestock-inverts", Icon: Snail, tone: "text-rose-300 bg-rose-400/10 border-rose-400/25" },
  { label: "Plants", href: "/listings?category=plants", Icon: Sprout, tone: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25" },
  { label: "Coral", href: "/listings?category=livestock-saltwater", Icon: Flower2, tone: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/25" },
  { label: "Tanks & gear", href: "/listings?category=tanks", Icon: Package, tone: "text-slate-200 bg-slate-300/10 border-slate-300/25" },
  { label: "Free stuff", href: "/listings?category=free", Icon: Gift, tone: "text-amber-300 bg-amber-400/10 border-amber-400/25" },
];

export default function Hero({
  locatable,
  liveListings,
}: {
  locatable: LocatableRegion[];
  liveListings: number;
}) {
  return (
    <section className="relative pt-24 pb-14 sm:pt-32 sm:pb-20">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[440px] w-[760px] max-w-full -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse, rgba(18,100,160,0.25) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-5 text-center sm:px-6">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-ocean-700/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ocean-400">
          <MapPin className="h-3.5 w-3.5" /> Local aquarium classifieds
        </p>

        <h1 className="glow-text mb-4 font-display text-[clamp(2rem,6vw,3.75rem)] leading-[1.08] text-white">
          Buy, sell and trade
          <br />
          <span className="text-ocean-300">aquarium stuff near you</span>
        </h1>

        <p className="mx-auto mb-7 max-w-xl text-base leading-relaxed text-ocean-300/85 sm:text-lg">
          Fish, shrimp, plants, coral and gear from keepers in your area. Free to post, no fees, and
          you keep every dollar.
        </p>

        {/* The live-fish banner: the thing most marketplaces won't let you do. */}
        <Link
          href="/listings?category=livestock-freshwater"
          className="group mx-auto mb-8 flex max-w-xl items-center gap-4 rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent p-3 pr-4 text-left transition-colors hover:border-emerald-300/60 sm:p-4"
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/40 sm:h-16 sm:w-16">
            <Fish className="h-8 w-8 text-emerald-300 sm:h-9 sm:w-9" />
            <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-[13px] font-bold text-ocean-950 shadow">
              ✓
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold leading-tight text-white sm:text-xl">
              Live fish welcome
            </span>
            <span className="mt-0.5 block text-sm leading-snug text-emerald-100/75">
              List your fry, shrimp, snails and plant trimmings like anything else. Meet up locally.
            </span>
          </span>
          <ArrowRight className="hidden h-5 w-5 shrink-0 text-emerald-300 transition-transform group-hover:translate-x-1 sm:block" />
        </Link>

        <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:flex sm:max-w-none sm:items-start sm:justify-center">
          {locatable.length > 0 ? (
            <NearMeButton
              regions={locatable}
              label="Find listings near me"
              fallbackHref="/marketplace"
              className={BTN_PRIMARY}
              wrapperClassName="col-span-2 w-full sm:col-span-1 sm:w-auto"
            />
          ) : (
            <Link href="/marketplace" className={`col-span-2 sm:col-span-1 ${BTN_PRIMARY}`}>
              <MapPin className="h-4 w-4 shrink-0" /> Find listings near me
            </Link>
          )}

          <Link href={POST_AD_PATH} className={BTN_SECONDARY}>
            <Plus className="h-4 w-4 shrink-0" /> Sell something
          </Link>

          <Link href="/listings" className={`group ${BTN_SECONDARY}`}>
            Browse all
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* What's for sale, at a glance */}
        <div className="mx-auto mt-9 grid max-w-3xl grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {TILES.map(({ label, href, Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-2 py-3.5 transition-colors hover:border-ocean-600"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium leading-tight text-ocean-100 group-hover:text-white sm:text-[13px]">
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* How it works, in one line each */}
        <div className="mx-auto mt-8 grid max-w-3xl gap-2 text-left sm:grid-cols-3 sm:gap-3">
          {[
            { Icon: Plus, title: "Post in a minute", body: "A few photos, a price, your area." },
            { Icon: ArrowLeftRight, title: "Sell or trade", body: "Cash, swaps, or free to a good home." },
            { Icon: HandCoins, title: "Keep it all", body: "No listing fees. No commission." },
          ].map(({ Icon, title, body }) => (
            <div
              key={title}
              className="flex items-center gap-3 rounded-xl border border-ocean-800/50 bg-ocean-950/40 px-3.5 py-3"
            >
              <Icon className="h-4 w-4 shrink-0 text-ocean-300" />
              <p className="text-sm leading-snug">
                <span className="font-medium text-white">{title}.</span>{" "}
                <span className="text-ocean-400">{body}</span>
              </p>
            </div>
          ))}
        </div>

        <p className="mt-7 text-sm text-ocean-500">
          {liveListings > 0
            ? `${liveListings.toLocaleString()} live ${liveListings === 1 ? "listing" : "listings"} · 413 metro areas`
            : "413 metro areas · free to post, always"}
        </p>
        <Link
          href="/where-to-sell-aquarium-fish"
          className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-300/90 hover:text-emerald-200"
        >
          First time selling fish? Here&apos;s how <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
