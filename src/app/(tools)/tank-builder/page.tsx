import type { Metadata } from "next";
import Link from "next/link";
import TankBuilder from "@/components/tank-builder/TankBuilder";
import { loadBuilderSpecies } from "@/lib/tankBuilder/species";
import { computeEquipment } from "@/lib/tankBuilder/engine";
import { TANK_SIZES, filledWeightLb } from "@/lib/tankBuilder/sizes";
import { breadcrumbJsonLd, ldJson, SITE } from "@/lib/marketplace/seo";

export const revalidate = 3600;

const TITLE = "Fish Compatibility Checker & Aquarium Stocking Calculator";
const DESCRIPTION =
  "Free tank builder: enter your aquarium size, add fish, and instantly see if they're compatible, how stocked the tank is, and the heater and filter size you need. Works in gallons or litres.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tank-builder" },
  openGraph: {
    title: `Tank Builder: ${TITLE}`,
    description: DESCRIPTION,
    url: `${SITE}/tank-builder`,
    type: "website",
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "How many fish can I put in my aquarium?",
    a: "It depends on how big the fish get and how much waste they make, not just their count. The Tank Builder adds up each fish's adult size, weights messy fish like goldfish, plecos and cichlids more heavily and shrimp and snails less, and compares that with a cautious limit for your tank. Under 90% is comfortable. 90 to 130% can work with strong filtration and regular water changes. Over 130% is overstocked.",
  },
  {
    q: "How do I know if two fish are compatible?",
    a: "Check five things: they need the same kind of water (freshwater, brackish or saltwater), their temperature ranges must overlap, neither should be big enough to eat the other, their temperaments should match, and schooling fish need their minimum group. The Tank Builder checks all of these at once and names the fish causing each problem.",
  },
  {
    q: "What size heater does my aquarium need?",
    a: "Plan on 3 to 5 watts per gallon. Use the higher end if your room gets cold or the tank sits near a window or outside wall. For tanks of 75 gallons and up, two smaller heaters at opposite ends heat more evenly and keep the tank safe if one fails. Coldwater fish like goldfish usually don't need one.",
  },
  {
    q: "How big a filter do I need?",
    a: "Look for a filter that moves 4 to 6 times the tank's volume every hour. A 29 gallon tank wants roughly 120 to 175 gallons per hour (GPH). For messy fish or a heavily stocked tank, aim for 8 times or more.",
  },
  {
    q: "How do I work out how many gallons my tank holds?",
    a: "Multiply the inside length, width and water height in inches, then divide by 231. A 30 × 12 × 18 inch tank holds about 28 gallons of water. In metric, multiply centimetres and divide by 1,000 to get litres. Tap “Measure it” in the Tank Builder to do the maths for you.",
  },
  {
    q: "What temperature should I set my heater to?",
    a: "Set it to the middle of the range all your fish share. The Tank Builder shows each fish's comfortable range on one chart, highlights the overlap, and gives you a heater setting.",
  },
  {
    q: "Is the Tank Builder free?",
    a: "Yes. It works without an account and remembers your build on your device. Sign in to save up to four tanks, add photos, show them on your profile, and log water tests over time.",
  },
];

export default async function TankBuilderPage() {
  const species = await loadBuilderSpecies();

  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Tank Builder",
    url: `${SITE}/tank-builder`,
    description: DESCRIPTION,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "Fish compatibility checker",
      "Aquarium stocking calculator",
      "Heater and filter size calculator",
      "Tank volume calculator from dimensions",
      "Water test analysis",
    ],
    publisher: { "@type": "Organization", name: "Underground Aquarium", url: SITE },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Tank Builder", path: "/tank-builder" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(app) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(crumbs) }} />

      <TankBuilder species={species} />

      <div className="mt-16 space-y-14 font-sans">
        <section>
          <h2 className="font-display text-2xl text-white sm:text-3xl">How the Tank Builder works</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              [
                "Set your tank size",
                "Type gallons or litres, tap a common size, or measure your tank and we'll work out the volume.",
              ],
              [
                "Add your fish",
                `Search ${species.length.toLocaleString()} fish, shrimp and snails. Schooling fish come in at their minimum group size, and the tank picture shows where each one swims.`,
              ],
              [
                "Read the results",
                "You get a compatibility score, every problem explained in plain English, how full the tank is, heater and filter sizes, and tankmates that would fit.",
              ],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-300">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold text-white">{t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ocean-200">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-2xl text-white sm:text-3xl">Heater and filter size by tank size</h2>
          <p className="mt-2 max-w-3xl text-[15px] text-ocean-200">
            Quick answers for the most common tanks. Tap a size for stocking ideas that pass our compatibility check.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-ocean-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tank</th>
                  <th className="px-4 py-3 font-semibold">Size (in)</th>
                  <th className="px-4 py-3 font-semibold">Heater</th>
                  <th className="px-4 py-3 font-semibold">Filter flow</th>
                  <th className="px-4 py-3 font-semibold">Filled weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {TANK_SIZES.map((t) => {
                  const e = computeEquipment(t.gallons, 50, false);
                  return (
                    <tr key={t.slug} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <Link href={`/tank-builder/${t.slug}`} className="font-semibold text-emerald-300 hover:text-emerald-200">
                          {t.gallons} gallon
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ocean-200">{t.dims.join(" × ")}</td>
                      <td className="px-4 py-3 text-ocean-100">
                        {e.heaterWattsLow}-{e.heaterWattsHigh} W
                      </td>
                      <td className="px-4 py-3 text-ocean-100">
                        {e.filterGphLow}-{e.filterGphHigh} GPH
                      </td>
                      <td className="px-4 py-3 text-ocean-200">~{filledWeightLb(t.gallons).toLocaleString()} lb</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl text-white sm:text-3xl">Aquarium FAQ</h2>
          <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white">
                  <h3 className="text-[15px]">{f.q}</h3>
                  <span className="text-xl leading-none text-ocean-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[15px] leading-relaxed text-ocean-200">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-sky-500/5 p-6">
          <h2 className="font-display text-xl text-white">Keep going</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/species" className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              Browse fish species
            </Link>
            <Link href="/water-check" className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              Check your water
            </Link>
            <Link href="/glossary" className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              Aquarium glossary
            </Link>
            <Link href="/marketplace" className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              Buy fish locally
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
