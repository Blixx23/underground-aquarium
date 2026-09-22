import type { Metadata } from "next";
import Link from "next/link";
import {
  Fish,
  Store,
  Users,
  Facebook,
  Newspaper,
  MapPin,
  ArrowRight,
  Plus,
  Check,
  X,
  Thermometer,
  Package,
  HeartHandshake,
  ShieldCheck,
  Gift,
  Scale,
  Sparkles,
} from "lucide-react";
import { POST_AD_PATH } from "@/lib/config";

const TITLE = "Where to Sell Aquarium Fish Locally (Without Getting Your Listing Pulled)";
const DESC =
  "Facebook Marketplace doesn't allow animals. Here's where you can actually sell or trade your fish, shrimp, snails and plants locally, how to price them, and how to bag them for pickup.";

export const metadata: Metadata = {
  title: "Where to Sell Aquarium Fish Locally",
  description: DESC,
  alternates: { canonical: "/where-to-sell-aquarium-fish" },
  openGraph: { title: TITLE, description: DESC, url: "/where-to-sell-aquarium-fish", type: "article" },
};

const FAQ = [
  {
    q: "Can you sell fish on Facebook Marketplace?",
    a: "No. Facebook's commerce policies say listings may not promote the buying or selling of animals, and that includes fish, shrimp and snails. Listings get removed, and repeat listings can get your Marketplace access limited. Some local Facebook groups allow fish sales under their own group rules, so check each group before posting.",
  },
  {
    q: "Can I sell fish on Craigslist?",
    a: "Craigslist's pets section is set up for rehoming animals, not selling them, and it generally only allows a small rehoming fee. Read the posting rules for your city before you list.",
  },
  {
    q: "Is it legal to sell fish I bred at home?",
    a: "For common aquarium species, hobbyists in the US generally sell or trade extras locally without any issue. Some states restrict specific species (certain invasive fish, snails and plants), and selling at a larger scale can bring business rules into play. When in doubt, check your state's fish and wildlife agency.",
  },
  {
    q: "How much should I charge for my fish?",
    a: "Look at what the same fish is going for near you, then price below your local fish store. Many hobbyists land somewhere around half of the shop's price for healthy, well-sized fish, less for small juveniles, more for rare species or proven breeding groups.",
  },
  {
    q: "What if nobody buys them?",
    a: "Trade them, offer them to your local fish store for store credit, bring them to a club swap, or list them free to a good home. Never release aquarium fish, snails or plants into local waterways.",
  },
];

export default function WhereToSellFishPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="overflow-x-clip px-5 pb-24 pt-24 sm:px-6 sm:pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ---------------- Hero ---------------- */}
      <section className="relative mx-auto max-w-3xl text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-10 h-[380px] w-[700px] max-w-full -translate-x-1/2"
          style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.18) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/40">
            <Fish className="h-9 w-9 text-emerald-300" />
          </span>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">
            Too many fish? Great problem.
          </p>
          <h1 className="glow-text mb-5 font-display text-[clamp(2rem,6vw,3.4rem)] leading-[1.08] text-white">
            Where to sell your fish
            <br />
            <span className="text-emerald-300">without getting your listing pulled</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-ocean-300 sm:text-lg">
            Your guppies did what guppies do. Your cherry shrimp colony has opinions about population
            control. Your plants need a haircut. Here&apos;s where those extras can actually go, and
            how to send them off right.
          </p>
          <div className="mx-auto grid max-w-md grid-cols-1 gap-3 sm:flex sm:max-w-none sm:justify-center">
            <Link
              href={POST_AD_PATH}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 font-semibold text-ocean-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" /> List your fish free
            </Link>
            <a
              href="#options"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl border border-ocean-700/60 bg-ocean-900/60 px-6 font-medium text-ocean-100 transition-colors hover:border-ocean-500"
            >
              Show me the options
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- The short answer ---------------- */}
      <section className="mx-auto mt-14 max-w-3xl">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-5 sm:p-6">
          <p className="mb-2 flex items-center gap-2 font-semibold text-amber-200">
            <Sparkles className="h-4 w-4" /> The short answer
          </p>
          <p className="leading-relaxed text-amber-50/85">
            <strong className="text-white">Facebook Marketplace doesn&apos;t allow animals</strong>,
            fish included, so those listings get pulled. Your best bets are{" "}
            <strong className="text-white">local fish stores</strong>,{" "}
            <strong className="text-white">aquarium club swaps and auctions</strong>,{" "}
            <strong className="text-white">local fish groups</strong> that allow sales, and{" "}
            <strong className="text-white">classifieds built for the hobby</strong> where live fish
            are welcome.
          </p>
        </div>
      </section>

      {/* ---------------- The options ---------------- */}
      <section id="options" className="mx-auto mt-16 max-w-5xl scroll-mt-28">
        <h2 className="mb-2 text-center font-display text-3xl text-white">Your options, honestly</h2>
        <p className="mx-auto mb-8 max-w-xl text-center text-ocean-400">
          Every one of these works. They just work differently.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Option
            Icon={Store}
            tone="text-sky-300 bg-sky-400/10 ring-sky-300/30"
            title="Your local fish store"
            best="Fast, easy, zero haggling"
            pros={["Many buy or trade healthy fish from hobbyists", "Store credit often beats cash", "Builds a friendship with your shop"]}
            cons={["Lowest price of any option", "They'll only take what they can sell"]}
            tip="Call first and ask what they're looking for. Shops love healthy, well-sized, home-bred fish."
            link={{ href: "/stores?near=1", label: "Find shops near you" }}
          />
          <Option
            Icon={Users}
            tone="text-amber-300 bg-amber-400/10 ring-amber-300/30"
            title="Club swaps and auctions"
            best="The most fun, and fair prices"
            pros={["Buyers who really know fish", "Rare stuff sells well", "You'll leave with new fish (sorry)"]}
            cons={["Only a few times a year", "You need to be there in person"]}
            tip="Label bags with species, count and your name. Good labels sell fish."
            link={{ href: "/events", label: "See events" }}
          />
          <Option
            Icon={Facebook}
            tone="text-blue-300 bg-blue-400/10 ring-blue-300/30"
            title="Local fish groups on Facebook"
            best="Big local audiences"
            pros={["Lots of local keepers in one place", "Many groups allow sales and trades"]}
            cons={["Each group has its own rules", "Posts get buried in a day", "Marketplace itself is off-limits"]}
            tip="Read the group rules first. Some only allow sales on certain days or in one thread."
          />
          <Option
            Icon={Newspaper}
            tone="text-violet-300 bg-violet-400/10 ring-violet-300/30"
            title="Craigslist"
            best="Old school, still around"
            pros={["Wide local reach", "Great for tanks and gear"]}
            cons={["The pets section is for rehoming, not selling", "Lots of lowballs and no-shows"]}
            tip="Use it for tanks, stands and equipment. Check your city's pet rules before listing livestock."
          />
        </div>

        {/* Ours, set apart but not shouting */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/15 via-ocean-900/50 to-ocean-950 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/40">
              <Fish className="h-8 w-8 text-emerald-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/80">
                Built for exactly this
              </p>
              <h3 className="mb-2 font-display text-2xl text-white">Underground Aquarium classifieds</h3>
              <ul className="grid gap-1.5 text-sm text-emerald-50/85 sm:grid-cols-2">
                {[
                  "Live fish, shrimp, snails and plants welcome",
                  "Free to post, no fees, no commission",
                  "Buyers near you, sorted by area",
                  "Sell, trade, or give away free",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:w-48">
              <Link
                href={POST_AD_PATH}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" /> List your fish
              </Link>
              <Link
                href="/listings?category=livestock-freshwater"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 px-4 text-sm text-emerald-100 transition-colors hover:bg-emerald-400/10"
              >
                See fish for sale
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Pricing ---------------- */}
      <section className="mx-auto mt-20 max-w-3xl">
        <SectionHead Icon={Scale} title="How to price your fish" sub="No spreadsheet required." />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { big: "~½", label: "of your local shop's price is a common starting point for healthy, adult-sized fish" },
            { big: "↓", label: "for small juveniles, common species, or a big batch sold together" },
            { big: "↑", label: "for rare species, proven breeding pairs, or fish with known lineage" },
          ].map((p) => (
            <div key={p.label} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 text-center">
              <p className="mb-2 font-display text-4xl text-emerald-300">{p.big}</p>
              <p className="text-sm leading-snug text-ocean-300">{p.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ocean-400">
          Check what the same fish is listed for near you first. Selling in groups (&ldquo;6 for
          $30&rdquo;) moves schooling fish faster and keeps them in groups at their new home, which is
          better for everyone with fins.
        </p>
      </section>

      {/* ---------------- Bagging ---------------- */}
      <section className="mx-auto mt-20 max-w-3xl">
        <SectionHead Icon={Package} title="Bagging fish for a pickup" sub="Send them off happy." />
        <ol className="space-y-3">
          {[
            ["Skip feeding for a day.", "Less food in means less waste in the bag, and cleaner water on the ride."],
            ["One-third water, two-thirds air.", "Use water from their own tank. The air is their oxygen supply."],
            ["Double bag, round the corners.", "Tuck or band the bottom corners so tiny fish and shrimp can't get trapped."],
            ["Spiky fish get extra care.", "Plecos and some catfish can poke through. Double bag, or use a container."],
            ["Hide them from the light.", "A paper bag or cooler keeps them calm. Dark is relaxing for fish."],
            ["Watch the weather.", "An insulated cooler protects them from hot cars and cold mornings."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 font-display text-emerald-300">
                {i + 1}
              </span>
              <p className="leading-snug">
                <span className="font-semibold text-white">{t}</span>{" "}
                <span className="text-ocean-300">{d}</span>
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-sm text-ocean-400">
          <Thermometer className="mt-0.5 h-4 w-4 shrink-0 text-ocean-500" />
          Share your water numbers (temperature, pH and hardness) with the buyer. It helps them
          acclimate, and it&apos;s the kind of thing that turns buyers into repeat buyers.
        </p>
      </section>

      {/* ---------------- Good seller ---------------- */}
      <section className="mx-auto mt-20 max-w-3xl">
        <SectionHead Icon={HeartHandshake} title="Be the seller people come back to" sub="The fish are counting on you." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            Icon={ShieldCheck}
            title="Only sell healthy fish"
            body="If something's off in the tank, wait. A sick fish sold is a whole tank of someone else's fish at risk."
          />
          <Card
            Icon={Fish}
            title="Be honest about what it is"
            body="Species, rough age, size, and anything quirky. A clear photo sells faster than a paragraph."
          />
          <Card
            Icon={MapPin}
            title="Meet somewhere public"
            body="A store parking lot is ideal. Your local fish shop's lot is even better, and you can pick up food on the way out."
          />
          <Card
            Icon={Gift}
            title="Can't sell them? Give them a home."
            body="Trade, offer store credit swaps, or list them free. Never release fish, snails or plants into local water."
          />
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-6 font-display text-3xl text-white">Questions people ask</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 open:border-ocean-700"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="h-4 w-4 shrink-0 text-ocean-400 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ocean-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="mx-auto mt-20 max-w-3xl">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 via-ocean-900/60 to-ocean-950 px-6 py-10 text-center sm:px-10">
          <Fish className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rotate-12 text-emerald-300/10" />
          <h2 className="relative mb-3 font-display text-3xl text-white sm:text-4xl">
            Somebody near you wants those fish
          </h2>
          <p className="relative mx-auto mb-7 max-w-lg text-emerald-50/80">
            Snap a photo, set a price, pick your area. Free to post, and live fish are welcome.
          </p>
          <div className="relative flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={POST_AD_PATH}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" /> List your fish free
            </Link>
            <Link
              href="/marketplace"
              className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-xl border border-emerald-400/30 px-7 text-emerald-100 transition-colors hover:bg-emerald-400/10"
            >
              Browse near you <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHead({ Icon, title, sub }: { Icon: typeof Fish; title: string; sub: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ocean-800/60 ring-1 ring-ocean-600/40">
        <Icon className="h-5 w-5 text-ocean-200" />
      </span>
      <div>
        <h2 className="font-display text-2xl leading-tight text-white sm:text-3xl">{title}</h2>
        <p className="text-sm text-ocean-400">{sub}</p>
      </div>
    </div>
  );
}

function Card({ Icon, title, body }: { Icon: typeof Fish; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4">
      <p className="mb-1.5 flex items-center gap-2 font-semibold text-white">
        <Icon className="h-4 w-4 text-emerald-300" /> {title}
      </p>
      <p className="text-sm leading-relaxed text-ocean-300">{body}</p>
    </div>
  );
}

function Option({
  Icon,
  tone,
  title,
  best,
  pros,
  cons,
  tip,
  link,
}: {
  Icon: typeof Fish;
  tone: string;
  title: string;
  best: string;
  pros: string[];
  cons: string[];
  tip: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-semibold leading-tight text-white">{title}</h3>
          <p className="text-xs text-ocean-400">{best}</p>
        </div>
      </div>
      <ul className="mb-3 space-y-1.5 text-sm">
        {pros.map((p) => (
          <li key={p} className="flex items-start gap-2 text-ocean-200">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {p}
          </li>
        ))}
        {cons.map((c) => (
          <li key={c} className="flex items-start gap-2 text-ocean-400">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-coral-400" /> {c}
          </li>
        ))}
      </ul>
      <p className="mt-auto rounded-xl bg-ocean-950/60 px-3 py-2.5 text-xs leading-relaxed text-ocean-300">
        <span className="font-semibold text-ocean-100">Tip:</span> {tip}
      </p>
      {link && (
        <Link href={link.href} className="mt-3 inline-flex items-center gap-1 text-sm text-ocean-300 hover:text-white">
          {link.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
