import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Check, Thermometer, X } from "lucide-react";
import { shareMeta } from "@/lib/seo/share";

const TITLE = "Ich in Fish (White Spot Disease): Signs, Treatment and Prevention";
const DESCRIPTION =
  "How to spot ich (Ichthyophthirius multifiliis) on aquarium fish, why the white spots come back, and how to treat it safely with heat, salt or medication, plus how to keep it out of your tank.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ich-in-fish" },
  ...shareMeta({ path: "/ich-in-fish", alt: "Ich (white spot disease) in aquarium fish" }),
};

// Kept on the cautious side on purpose: when in doubt, follow the product label.
const FAQ = [
  {
    q: "What is ich in fish?",
    a: "Ich (also spelled ick) is white spot disease, caused by a single-celled parasite called Ichthyophthirius multifiliis. It is one of the most common diseases in freshwater aquariums. It shows up as small white spots, like grains of salt, on the body, fins and gills.",
  },
  {
    q: "What causes ich?",
    a: "Ich almost always arrives with new fish, plants or water from another tank, and it takes hold when fish are stressed, for example by a temperature drop, poor water quality or a move. Healthy, unstressed fish can fight off light exposure.",
  },
  {
    q: "Why does ich come back after the spots go away?",
    a: "The spots are the parasite buried in the fish's skin, where treatments can't reach it. When it drops off, it multiplies on the tank floor and releases hundreds of free-swimming young that look for a new fish. Treatments only kill that free-swimming stage, so you keep treating for several days after the last spot is gone.",
  },
  {
    q: "How long does it take to get rid of ich?",
    a: "Usually one to two weeks at tropical temperatures. The parasite's life cycle runs much faster in warm water and much slower in cool water, so coldwater tanks can take several weeks. Keep treating until at least 3 to 5 days after you see the last spot (longer in cool water).",
  },
  {
    q: "Will ich go away on its own?",
    a: "Sometimes a very mild case clears up if the fish are otherwise healthy and the water is stable, but ich can kill fish quickly, especially when it reaches the gills. It's safer to treat as soon as you see spots.",
  },
  {
    q: "Is saltwater ich the same thing?",
    a: "No. Marine white spot is caused by a different parasite, Cryptocaryon irritans, and it's treated differently (for example copper or tank transfer in a separate hospital tank, never in a reef tank with corals and inverts). This page is about freshwater ich.",
  },
];

export default function IchPage() {
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
      <article className="mx-auto max-w-3xl text-ocean-200">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-emerald-400">Fish health</p>
        <h1 className="mb-3 font-display text-3xl text-white sm:text-4xl">Ich in fish (white spot disease)</h1>
        <p className="mb-6 text-ocean-300">
          Small white spots that look like someone sprinkled salt on your fish? That&apos;s almost always ich. It&apos;s
          common, it&apos;s treatable, and the one mistake that lets it come back is stopping treatment too early.
        </p>

        <div className="mb-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-5">
          <p className="mb-2 font-semibold text-emerald-300">The short answer</p>
          <p className="leading-relaxed text-emerald-50/90">
            Ich is a parasite (<em>Ichthyophthirius multifiliis</em>). Treat the whole tank, not just the spotted fish,
            using gradual heat, aquarium salt or an ich medication, following the product label. Keep treating for 3 to
            5 days after the last spot disappears, because the parasite is only killable while it swims free in the
            water.
          </p>
        </div>

        <h2 className="mb-3 font-display text-2xl text-white">Signs of ich</h2>
        <ul className="mb-10 space-y-2">
          {[
            "White spots about the size of a grain of salt on the body, fins or gills.",
            "Flashing: fish rubbing or darting against rocks, decor or the gravel.",
            "Clamped fins, hiding, or hanging near the surface or filter.",
            "Fast breathing or gasping, a sign it has reached the gills (treat right away).",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <h2 className="mb-3 font-display text-2xl text-white">Why treatment has to keep going</h2>
        <p className="mb-4 leading-relaxed">
          Each white spot is a parasite tucked under the fish&apos;s skin, where no treatment can reach it. After a few
          days it drops off, settles on the gravel or glass, and splits into hundreds of tiny swimmers that need to find
          a fish within a day or two. That swimming stage is the only one treatments kill.
        </p>
        <p className="mb-10 leading-relaxed">
          The cycle runs fast in warm water (a few days) and slowly in cool water (a couple of weeks or more). So the
          spots can vanish and come back if you stop early. Keep going until at least 3 to 5 days after the last spot,
          and longer in cooler tanks.
        </p>

        <h2 className="mb-4 font-display text-2xl text-white">How to treat ich</h2>
        <div className="mb-4 space-y-4">
          <div className="rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-5">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <Thermometer className="h-4 w-4 text-amber-300" /> 1. Raise the temperature slowly (tropical tanks only)
            </h3>
            <p className="text-sm leading-relaxed">
              Warmer water speeds up the parasite&apos;s life cycle so treatment works faster. Many keepers raise a
              tropical tank a degree or two per day to around 82 to 86°F (28 to 30°C), if every fish in the tank
              tolerates it. Warm water holds less oxygen, so add an air stone or point the filter output at the surface.
              Skip this for coldwater fish like goldfish and for species that need cool water.
            </p>
          </div>
          <div className="rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-5">
            <h3 className="mb-2 font-semibold text-white">2. Aquarium salt</h3>
            <p className="text-sm leading-relaxed">
              Aquarium salt (not table salt with additives) is a long-used ich treatment for many freshwater fish. Use
              the dose on the package, dissolve it first, and add it gradually. Be careful with scaleless and sensitive
              fish (loaches, many catfish and corydoras), live plants, snails and shrimp, which may not tolerate it.
              Salt doesn&apos;t evaporate, so only add more with new water at water changes.
            </p>
          </div>
          <div className="rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-5">
            <h3 className="mb-2 font-semibold text-white">3. Ich medication</h3>
            <p className="text-sm leading-relaxed">
              Fish stores sell ich treatments (often malachite green, formalin or copper based). Follow the label
              exactly, remove carbon from the filter (it pulls medication out), and keep the full course. Many ich
              medications are harmful to shrimp, snails and other invertebrates, and some need half doses for sensitive
              fish, so read the label before dosing.
            </p>
          </div>
        </div>
        <div className="mb-10 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-4 text-sm text-amber-50/90">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Treat the whole tank, even fish without spots. Don&apos;t mix medications or combine salt and medication
            unless the label says it&apos;s safe. Do your usual water changes (match the temperature), vacuum the gravel
            to remove parasites waiting there, and if fish are gasping or dying fast, ask your local fish store or an
            aquatic vet.
          </span>
        </div>

        <h2 className="mb-3 font-display text-2xl text-white">How to keep ich out</h2>
        <ul className="mb-4 space-y-2">
          {[
            "Quarantine new fish in a separate tank for 2 to 4 weeks before adding them.",
            "Don't pour store water into your tank: net the fish over instead.",
            "Keep the temperature steady with a good heater, especially in winter and after water changes.",
            "Keep water quality good. Stressed fish catch ich far more easily.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mb-10 flex items-start gap-2.5">
          <X className="mt-1 h-4 w-4 shrink-0 text-coral-400" />
          <span>Never release sick (or healthy) aquarium fish into ponds, lakes or streams.</span>
        </p>

        <p className="mb-10 text-sm text-ocean-400">
          Not sure the water is right? Run your test results through the{" "}
          <Link href="/water-check" className="text-emerald-400 hover:text-emerald-300">
            Water Check
          </Link>
          , or ask in the{" "}
          <Link href="/forums" className="text-emerald-400 hover:text-emerald-300">
            forums
          </Link>{" "}
          with a photo of the spots.
        </p>

        <h2 className="mb-4 font-display text-2xl text-white">Questions about ich</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-4">
              <summary className="cursor-pointer list-none font-medium text-white">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ocean-300">{f.a}</p>
            </details>
          ))}
        </div>
      </article>
    </main>
  );
}
