import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarPlus, Check, Repeat, Tag } from "lucide-react";
import EventsList from "@/app/events/EventsList";
import { loadUpcomingSwaps } from "@/lib/events/swaps";
import { POST_AD_PATH } from "@/lib/config";
import { shareMeta } from "@/lib/seo/share";

// New swaps get added all the time; a fresh list every hour is plenty.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fish Swaps Near Me: Aquarium & Frag Swap Meets, Auctions and Shows",
  description:
    "Upcoming aquarium fish swaps, frag swaps, club auctions and coral shows near you, plus what to bring, how to price your fish and how to bag them. Free to list your swap.",
  alternates: { canonical: "/fish-swaps" },
  ...shareMeta({ path: "/fish-swaps", alt: "Fish swaps, frag swaps and aquarium auctions near you" }),
};

const FAQ = [
  {
    q: "What is a fish swap?",
    a: "A fish swap (or swap meet) is a local event where hobbyists and small breeders buy, sell and trade fish, shrimp, snails, plants, corals and used gear, usually hosted by an aquarium club or a fish store. Prices are often well below shop prices because you're buying straight from the person who bred them.",
  },
  {
    q: "What is a frag swap?",
    a: "A frag swap is the saltwater version: reef keepers sell and trade coral fragments (frags) cut from their own colonies, along with fish and equipment. Coral shows like Coral Con and regional reef club swaps are the big ones.",
  },
  {
    q: "How do I find a fish swap near me?",
    a: "Check the list on this page, ask your local fish store, and look at your nearest aquarium club or society. Most swaps happen a few times a year and are announced a few weeks ahead. You can also get alerts for local classified ads in between swaps.",
  },
  {
    q: "What should I bring to sell at a fish swap?",
    a: "Healthy fish bagged with plenty of air (or oxygen) and labeled with the species, quantity and price. Bring a cooler or insulated box to keep bags warm, small bills for change, and a way to take card or app payments. Check the swap's rules first: many require you to sign up as a seller and some limit what can be sold.",
  },
  {
    q: "How much should I charge at a swap?",
    a: "Look at what the same fish sells for at local shops and price below it. Many hobbyists land around half of the shop price for healthy, decent-sized fish. Bundles (a group of 6 or 10) move fastest.",
  },
];

export default async function FishSwapsPage() {
  const swaps = await loadUpcomingSwaps();

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
    <main className="min-h-screen px-5 pb-24 pt-24 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-emerald-400">Events</p>
        <h1 className="mb-3 font-display text-3xl text-white sm:text-4xl">Fish swaps near you</h1>
        <p className="mb-6 text-ocean-300">
          Aquarium swap meets, frag swaps, club auctions and coral shows, nearest first once you share your area. Buy
          straight from local breeders, sell your extras, and meet the people who keep the same fish you do.
        </p>

        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/events/submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
          >
            <CalendarPlus className="h-4 w-4" /> Add your swap free
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            All aquarium events <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <h2 className="mb-4 font-display text-2xl text-white">Upcoming swaps, auctions and shows</h2>
        {swaps.length > 0 ? (
          <EventsList events={swaps} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <Repeat className="mx-auto mb-3 h-8 w-8 text-ocean-500" />
            <p className="mb-1 font-medium text-white">No swaps on the calendar right now</p>
            <p className="text-sm text-ocean-400">
              Know of one? Add it free and we&apos;ll put it in front of local hobbyists.
            </p>
          </div>
        )}

        {/* Between swaps: the classifieds are a swap that never closes. */}
        <Link
          href="/marketplace"
          className="mt-8 flex items-center gap-4 rounded-2xl border border-sky-500/30 bg-sky-500/[0.07] p-5 transition-colors hover:border-sky-400/60"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
            <Tag className="h-5 w-5 text-sky-300" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-white">No swap this month? Use the local classifieds</span>
            <span className="block text-sm text-sky-100/70">
              Fish, shrimp, plants and gear from hobbyists near you. Free to post, no fees, local pickup.
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-sky-300" />
        </Link>

        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl text-white">Selling at a swap: a quick checklist</h2>
          <ul className="space-y-2.5">
            {[
              "Sign up as a seller ahead of time if the swap asks for it, and read its rules.",
              "Bag fish the morning of the swap with extra air or oxygen, and double-bag anything spiny.",
              "Label every bag: species, how many, and the price.",
              "Keep bags warm in a cooler or insulated box, and out of direct sun.",
              "Bring small bills for change and a way to take card or app payments.",
              "Only bring healthy fish. If a tank has had ich or losses recently, sit this one out.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-ocean-200">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ocean-400">
            More on pricing and bagging in{" "}
            <Link href="/where-to-sell-aquarium-fish" className="text-emerald-400 hover:text-emerald-300">
              where to sell aquarium fish
            </Link>
            , or{" "}
            <Link href={POST_AD_PATH} className="text-emerald-400 hover:text-emerald-300">
              list your extras free
            </Link>
            .
          </p>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl text-white">Questions about fish swaps</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-4">
                <summary className="cursor-pointer list-none font-medium text-white">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-ocean-300">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
