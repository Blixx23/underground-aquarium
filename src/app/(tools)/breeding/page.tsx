import type { Metadata } from "next";
import Link from "next/link";
import { Award, Egg, Fish, Leaf, ArrowRight } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { loadGuideCards } from "@/lib/breeding/guides";
import { CLASS_COLORS, CLASS_LADDER } from "@/lib/society/classes";
import GuideBrowser from "@/components/breeding/GuideBrowser";
import BreederCta from "@/components/breeding/BreederCta";
import { shareMeta } from "@/lib/seo/share";
import { ldJson } from "@/lib/jsonLd";

export const revalidate = 3600;

const SITE = "https://www.undergroundaquarium.com";
const TITLE = "Aquarium Fish Breeding Guides: How to Breed 200+ Species";
const DESCRIPTION =
  "Step-by-step breeding guides for over 200 aquarium fish, shrimp, snails and plants, sorted from beginner to expert. Spawning, eggs, raising fry, and how to get certified.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/breeding" },
  ...shareMeta({ path: "/breeding", alt: "Aquarium fish breeding guides" }),
};

// The fish most people should breed first: easy, popular and quick.
const STARTERS = ["guppy", "cherry-shrimp", "platy", "endlers-livebearer", "zebra-danio", "convict-cichlid", "bristlenose-pleco", "kribensis"];

const FAQ = [
  {
    q: "What is the easiest fish to breed in an aquarium?",
    a: "Livebearers like guppies, platies and Endler's livebearers are the easiest: they give birth to swimming fry with no help, and the main job is keeping the adults from eating them. Cherry shrimp, zebra danios and convict cichlids are close behind. They are all Class A on the Society's list.",
  },
  {
    q: "What do the classes A to F mean?",
    a: "They are the Underground Aquarium Society's difficulty classes. Class A fish breed readily in a community tank; Class F fish are rarely bred in captivity at all. The class sets how many points a successful, verified spawn earns.",
  },
  {
    q: "How do I get a breeder certificate?",
    a: "Join the Society, open a spawn log for your fish before it spawns, and add photos at each stage up to a 60-day grow-out. Other members review the record, and once it's approved you can download a Certified Breeder certificate for that species.",
  },
  {
    q: "What should fish fry eat first?",
    a: "It depends on their size. Livebearer fry and larger egg-layer fry take baby brine shrimp and crushed flake right away; tiny fry like tetras, gouramis and many killifish need infusoria or other microscopic foods for the first days. Each guide lists the right first foods.",
  },
];

type Report = { species_slug: string; species_name: string };

export default async function BreedingIndex() {
  const [guides, { data: reportRows }] = await Promise.all([
    loadGuideCards(),
    supabasePublic.from("public_breeding_guides").select("species_slug, species_name"),
  ]);
  const reports = (reportRows ?? []) as Report[];
  const reportCount = new Map<string, number>();
  for (const r of reports) reportCount.set(r.species_slug, (reportCount.get(r.species_slug) ?? 0) + 1);

  const bySlug = new Map(guides.map((g) => [g.slug, g]));
  const starters = STARTERS.map((s) => bySlug.get(s)).filter((g): g is NonNullable<typeof g> => !!g);
  const fishCount = guides.filter((g) => g.program === "bap").length;
  const plantCount = guides.length - fishCount;
  const sample = bySlug.get("guppy") ?? guides.find((g) => g.program === "bap");
  // Member reports for fish that don't have a written guide yet.
  const reportOnly = [...reportCount.keys()].filter((s) => !bySlug.has(s));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Aquarium fish breeding guides",
      description: DESCRIPTION,
      url: `${SITE}/breeding`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: guides.length,
        itemListElement: guides.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `How to breed ${g.name}`,
          url: `${SITE}/breeding/${g.slug}`,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Breeding guides", item: `${SITE}/breeding` },
      ],
    },
  ];

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 sm:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <div className="max-w-5xl mx-auto">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          <Egg className="h-4 w-4" /> Breeding guides
        </p>
        <h1 className="font-display text-3xl text-white sm:text-5xl">Breed it. Raise it. Get certified.</h1>
        <p className="mt-3 max-w-3xl text-base text-ocean-200 sm:text-lg">
          {`Step-by-step guides for ${fishCount} fish, shrimp and snails and ${plantCount} plants, sorted from beginner to expert.`}
          <span className="hidden sm:inline"> How to set up, spawn, hatch and raise the fry, so you can start easy and work your way up to the fish few people have ever bred.</span>
        </p>

        <section className="mt-6 sm:mt-10">
          <GuideBrowser guides={guides}>
            {/* The ladder at a glance; each class jumps to its list. A sideways strip on phones. */}
            <nav
              aria-label="Difficulty classes"
              className="-mx-6 mb-6 flex snap-x scroll-px-6 gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6"
            >
              {CLASS_LADDER.map((c) => (
                <a
                  key={c.letter}
                  href={`#class-${c.letter.toLowerCase()}`}
                  className="w-40 shrink-0 snap-start rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-3 transition-colors hover:border-white/20 sm:w-auto"
                  style={{ borderTop: `3px solid ${CLASS_COLORS[c.letter]}` }}
                >
                  <span className="flex items-baseline justify-between">
                    <span className="font-display text-xl" style={{ color: CLASS_COLORS[c.letter] }}>
                      Class {c.letter}
                    </span>
                    <span className="text-xs text-ocean-400">{c.points} pts</span>
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ocean-400">{c.blurb}</span>
                </a>
              ))}
            </nav>

            {starters.length > 0 && (
              <div className="mb-8">
                <h2 className="font-display text-xl text-white sm:text-2xl">Start here: the easiest fish to breed</h2>
                <p className="mt-1 text-sm text-ocean-300">Reliable, popular and quick to show results.</p>
                <ul className="-mx-6 mt-3 flex snap-x scroll-px-6 gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                  {starters.map((g) => (
                    <li key={g.slug} className="w-56 shrink-0 snap-start sm:w-auto">
                      <Link
                        href={`/breeding/${g.slug}`}
                        className="flex h-full flex-col rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 transition-colors hover:border-emerald-400/50"
                      >
                        <span className="font-medium text-white">{g.name}</span>
                        <span className="mt-0.5 text-xs text-ocean-400">{[g.method?.replace(/\s*\(.*\)\s*$/, ""), g.points != null ? `${g.points} points` : null].filter(Boolean).join(" · ")}</span>
                        <span className="mt-2 line-clamp-3 text-xs text-ocean-300">{g.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GuideBrowser>
        </section>

        {sample && (
          <div className="mt-14">
            <BreederCta
              slug={sample.slug}
              name={sample.name}
              program="bap"
              points={sample.points}
              classLetter={sample.classLetter}
              awardId={sample.awardId}
            />
          </div>
        )}

        {reportOnly.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-white">More from members&apos; tanks</h2>
            <p className="mt-1 text-sm text-ocean-300">Breeding reports members have shared for fish without a written guide yet.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {reportOnly.map((s) => (
                <Link
                  key={s}
                  href={`/breeding/${s}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-ocean-200 hover:border-emerald-500/40 hover:text-white"
                >
                  {reports.find((r) => r.species_slug === s)?.species_name ?? s} ({reportCount.get(s)})
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14">
          <h2 className="font-display text-2xl text-white">Breeding questions</h2>
          <dl className="mt-4 space-y-3">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3.5">
                <dt className="font-medium text-white">{f.q}</dt>
                <dd className="mt-1.5 leading-relaxed text-ocean-200">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-sky-500/5 p-6">
          <h2 className="font-display text-xl text-white">Keep going</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/species" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              <Fish className="h-4 w-4" /> Fish care guides
            </Link>
            <Link href="/tank-builder" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              Plan a breeding tank
            </Link>
            <Link href="/glossary" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              <Leaf className="h-4 w-4" /> Glossary
            </Link>
            <Link href="/society" className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 px-4 py-2 text-amber-200 hover:bg-amber-500/10">
              <Award className="h-4 w-4" /> The Society <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
