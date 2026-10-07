import BreedingSnapshot from "@/components/breeding/BreedingSnapshot";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Egg, Fish, Leaf, Lightbulb, BookOpen, Wrench } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import {
  FACT_LABELS,
  classLabel,
  easierThan,
  loadGuide,
  loadGuideCards,
} from "@/lib/breeding/guides";
import { CLASS_LADDER } from "@/lib/society/classes";
import { glossaryLinker } from "@/lib/glossary/links";
import { buildPath } from "@/lib/tankBuilder/share";
import BreederCta from "@/components/breeding/BreederCta";
import OpenOnWide from "@/components/breeding/OpenOnWide";
import { crossesFor } from "@/lib/species/crosses";
import { ldJson } from "@/lib/jsonLd";

export const revalidate = 3600;

const SITE = "https://www.undergroundaquarium.com";

type Params = { params: Promise<{ species: string }> };

type Report = {
  id: string;
  program: string;
  species_name: string;
  notes: string | null;
  photos: string[] | null;
  event_date: string | null;
  created_at: string;
  club_name: string;
  club_slug: string;
  club_is_public: boolean;
  breeder_username: string | null;
  breeder_name: string | null;
};

type Care = {
  slug: string;
  common_name: string;
  temp_min_f: number | null;
  temp_max_f: number | null;
  ph_min: number | null;
  ph_max: number | null;
  gh_min: number | null;
  gh_max: number | null;
  max_size_in: number | null;
  min_tank_gal: number | null;
  min_group_size: number | null;
};

export async function generateStaticParams() {
  const { data } = await supabasePublic.from("breeding_guides").select("slug");
  return (data ?? []).map((g) => ({ species: g.slug as string }));
}

async function fetchReports(slug: string): Promise<Report[]> {
  const { data } = await supabasePublic
    .from("public_breeding_guides")
    .select("*")
    .eq("species_slug", slug)
    .order("created_at", { ascending: false });
  return (data ?? []) as Report[];
}

const verb = (g: { program: string }) => (g.program === "hap" ? "Propagate" : "Breed");

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { species } = await params;
  const guide = await loadGuide(species);
  if (guide) {
    const url = `/breeding/${guide.slug}`;
    // Fish guides share their certificate preview; plants the general card.
    const image =
      guide.program === "bap" && guide.awardId
        ? [{ url: `/api/breeding/certificate/${guide.slug}`, width: 1200, height: 927, alt: `Certified ${guide.name} Breeder certificate (sample)` }]
        : [{ url: `/api/share-card?path=${encodeURIComponent(url)}`, width: 1200, height: 630, alt: guide.seoTitle }];
    return {
      title: guide.seoTitle,
      description: guide.summary,
      alternates: { canonical: url },
      openGraph: { title: guide.seoTitle, description: guide.summary, url, type: "article", siteName: "Underground Aquarium", images: image },
      twitter: { card: "summary_large_image", title: guide.seoTitle, description: guide.summary, images: image.map((i) => i.url) },
    };
  }
  const reports = await fetchReports(species);
  if (reports.length === 0) return { title: "Breeding guide not found" };
  const name = reports[0].species_name;
  return {
    title: `Breeding ${name}: Members' Spawn Reports`,
    description: `How aquarium hobbyists bred ${name}: real spawn reports with setups and photos from Underground Aquarium Society members.`,
    alternates: { canonical: `/breeding/${species}` },
  };
}

const sectionId = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default async function BreedingGuidePage({ params }: Params) {
  const { species } = await params;
  const guide = await loadGuide(species);
  const reports = await fetchReports(guide?.speciesSlug ?? species);
  if (!guide) {
    if (reports.length === 0) notFound();
    return <ReportsOnly reports={reports} />;
  }

  const [all, careRow] = await Promise.all([
    loadGuideCards(),
    guide.speciesSlug
      ? supabasePublic
          .from("species")
          .select("slug, common_name, temp_min_f, temp_max_f, ph_min, ph_max, gh_min, gh_max, max_size_in, min_tank_gal, min_group_size")
          .eq("slug", guide.speciesSlug)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const care = (careRow.data as Care | null) ?? null;
  // Species it can crossbreed with: a "keep the line pure" note for breeders.
  const cross = guide.speciesSlug ? (await crossesFor(guide.speciesSlug)).crosses : [];
  const { data: crossNameRows } = cross.length
    ? await supabasePublic.from("species").select("slug, common_name").in("slug", cross.map((c) => c.slug))
    : { data: [] as { slug: string; common_name: string }[] };
  const crossNames = new Map(((crossNameRows ?? []) as { slug: string; common_name: string }[]).map((r) => [r.slug, r.common_name]));
  const easier = easierThan(guide, all, 4);
  const sameClass = all
    .filter((g) => g.slug !== guide.slug && g.program === guide.program && g.points === guide.points && g.category === guide.category)
    .slice(0, 6);
  const klass = CLASS_LADDER.find((c) => c.points === guide.points);
  const gl = await glossaryLinker({ max: 12 });

  const range = (a: number | null, b: number | null, unit: string) => (a != null && b != null ? `${a}-${b}${unit}` : null);
  const careFacts = care
    ? ([
        ["Temperature", range(care.temp_min_f, care.temp_max_f, "°F")],
        ["pH", range(care.ph_min, care.ph_max, "")],
        ["Hardness", range(care.gh_min, care.gh_max, " dGH")],
        ["Adult size", care.max_size_in != null ? `${care.max_size_in} in` : null],
      ].filter(([, v]) => v) as [string, string][])
    : [];

  const url = `${SITE}/breeding/${guide.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.seoTitle,
      description: guide.summary,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      about: { "@type": "Thing", name: guide.name, ...(guide.scientific ? { alternateName: guide.scientific } : {}) },
      author: { "@type": "Organization", name: "Underground Aquarium", url: SITE },
      publisher: { "@type": "Organization", name: "Underground Aquarium", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` } },
      ...(guide.updatedAt ? { dateModified: guide.updatedAt } : {}),
      ...(guide.program === "bap" && guide.awardId ? { image: `${SITE}/api/breeding/certificate/${guide.slug}` } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Breeding guides", item: `${SITE}/breeding` },
        { "@type": "ListItem", position: 2, name: guide.name, item: url },
      ],
    },
  ];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <div className="max-w-3xl mx-auto">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-ocean-400">
          <Link href="/breeding" className="hover:text-white">
            Breeding guides
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          {klass ? (
            <Link href={`/breeding#class-${klass.letter.toLowerCase()}`} className="hover:text-white">
              Class {klass.letter}
            </Link>
          ) : (
            <span>{guide.points != null ? `${guide.points} points` : "Guide"}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-ocean-200">{guide.name}</span>
        </nav>

        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          {guide.program === "hap" ? <Leaf className="h-4 w-4" /> : <Egg className="h-4 w-4" />}
          {guide.program === "hap" ? "Propagation guide" : "Breeding guide"}
        </p>
        <h1 className="font-display text-3xl text-white sm:text-5xl">
          How to {verb(guide).toLowerCase()} {guide.name}
        </h1>
        {guide.scientific && <p className="mt-1 text-lg italic text-ocean-300">{guide.scientific}</p>}

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span
            className={`${guide.program === "bap" ? "hidden sm:inline-block" : ""} rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-semibold text-amber-200`}
          >
            {classLabel(guide.points)}
          </span>
          {guide.method && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
              <span className="sm:hidden">{guide.method.replace(/\s*\(.*\)\s*$/, "")}</span>
              <span className="hidden sm:inline">{guide.method}</span>
            </span>
          )}
          {guide.category && <span className="rounded-full border border-white/10 px-3 py-1 text-ocean-300">{guide.category}</span>}
        </div>
        {klass && (
          <p className={`${guide.program === "bap" ? "hidden sm:block" : ""} mt-2 text-sm text-ocean-400`}>Society difficulty: {klass.blurb}</p>
        )}

        {/* The highlights first: difficulty, spawn-to-grown timeline and the key facts. */}
        {guide.program === "bap" && <BreedingSnapshot guide={guide} speciesName={guide.name} reports={0} variant="guide" />}

        {/* Jump to any part of a long guide; scrolls sideways on phones. */}
        <nav aria-label="In this guide" className="-mx-6 mt-5 flex snap-x scroll-px-6 gap-1.5 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {[
            ...guide.sections.map((sec) => [sectionId(sec.heading), sec.heading.replace(/:.*$/, "")]),
            ...(guide.awardId ? [["certificate", "Get certified"]] : []),
            ...(guide.faq.length ? [["questions", "Questions"]] : []),
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="shrink-0 snap-start rounded-full border border-white/10 px-3 py-1.5 text-xs text-ocean-300 hover:border-emerald-500/40 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <p className="mt-6 text-base leading-relaxed text-ocean-200 sm:text-lg">{gl.link(guide.intro)}</p>

        {/* Quick facts */}
        <OpenOnWide
          className="mt-8 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5"
          summary={<h2 className="font-display text-xl text-white">All the facts</h2>}
        >
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {FACT_LABELS.filter(([k]) => guide.facts[k]).map(([k, label]) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ocean-500">{label}</dt>
                <dd className="text-sm text-ocean-100">{guide.facts[k]}</dd>
              </div>
            ))}
          </dl>
          {careFacts.length > 0 && care && (
            <p className="mt-4 border-t border-white/10 pt-3 text-xs text-ocean-400">
              Everyday care range: {careFacts.map(([l, v]) => `${l} ${v}`).join(" · ")}.{" "}
              <Link href={`/species/${care.slug}`} className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200">
                Full {care.common_name} care guide
              </Link>
            </p>
          )}
        </OpenOnWide>

        {cross.length > 0 && (
          <aside className="mt-6 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 text-sm">
            <p className="font-medium text-white">Keep the line pure</p>
            <p className="mt-1 text-ocean-200">
              {guide.name} can crossbreed with{" "}
              {cross.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 ? (i === cross.length - 1 ? " and " : ", ") : ""}
                  <Link href={`/species/${c.slug}`} className="text-sky-200 underline underline-offset-2 hover:text-white">
                    {crossNames.get(c.slug) ?? c.slug}
                  </Link>
                </span>
              ))}
              . Breed them in a tank without the other, or the fry will be hybrids.{" "}
              <Link href="/breeding/crossbreeding" className="text-emerald-300 hover:text-emerald-200">
                Which fish can crossbreed?
              </Link>
            </p>
          </aside>
        )}

        {/* The guide itself */}
        <div className="mt-10 space-y-8">
          {guide.sections.map((sec) => (
            <section key={sec.heading} id={sectionId(sec.heading)} className="scroll-mt-24">
              <h2 className="mb-3 font-display text-xl text-white sm:text-2xl">{sec.heading}</h2>
              {sec.text.split(/\n\n+/).map((para, i) =>
                para.trim().startsWith("- ") ? (
                  <ul key={i} className="mb-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ocean-200">
                    {para
                      .split(/\n/)
                      .map((l) => l.replace(/^-\s*/, "").trim())
                      .filter(Boolean)
                      .map((l, j) => (
                        <li key={j}>{gl.link(l)}</li>
                      ))}
                  </ul>
                ) : (
                  <p key={i} className="mb-3 leading-relaxed text-ocean-200">
                    {gl.link(para)}
                  </p>
                )
              )}
            </section>
          ))}
        </div>

        {guide.societyTip && (
          <aside className="mt-8 flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Logging it for the Society</p>
              <p className="mt-1 text-sm leading-relaxed text-ocean-200">{guide.societyTip}</p>
            </div>
          </aside>
        )}

        {guide.awardId && (
        <div id="certificate" className="mt-8 scroll-mt-24">
          <BreederCta
            slug={guide.slug}
            name={guide.name}
            program={guide.program}
            points={guide.points}
            classLetter={guide.classLetter}
            awardId={guide.awardId}
          />
        </div>
        )}

        {easier.length > 0 && (
          <section className="mt-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
            <h2 className="font-display text-xl text-white">
              {(guide.points ?? 0) <= CLASS_LADDER[0].points ? "More easy ones to try" : "Want an easier start?"}
            </h2>
            <p className="mt-1 text-sm text-ocean-300">
              {(guide.points ?? 0) <= CLASS_LADDER[0].points
                ? "Other beginner-friendly species in the same group."
                : "Build your skills on these first. Same know-how, more forgiving fish."}
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {easier.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/breeding/${g.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 hover:border-emerald-500/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{g.name}</span>
                      <span className="block truncate text-xs text-ocean-400">{classLabel(g.points)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ocean-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {reports.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 font-display text-2xl text-white">Members who&apos;ve bred {guide.name}</h2>
            <ReportList reports={reports} name={guide.name} />
          </section>
        )}

        {guide.faq.length > 0 && (
          <section id="questions" className="mt-10 scroll-mt-24">
            <h2 className="mb-4 font-display text-xl text-white sm:text-2xl">{guide.name} breeding questions</h2>
            <dl className="space-y-3">
              {guide.faq.map((f) => (
                <div key={f.q} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                  <dt className="font-medium text-white">{f.q}</dt>
                  <dd className="mt-1.5 leading-relaxed text-ocean-200">{gl.link(f.a)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-sky-500/5 p-5">
          <h2 className="font-display text-xl text-white">Related</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {care && (
              <Link href={`/species/${care.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
                <Fish className="h-4 w-4" /> {care.common_name} care guide
              </Link>
            )}
            {care && (
              <Link
                href={buildPath(care.min_tank_gal ?? null, [{ slug: care.slug, qty: Math.max(1, care.min_group_size ?? 2) }])}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10"
              >
                <Wrench className="h-4 w-4" /> Plan the tank
              </Link>
            )}
            {guide.glossarySlug && (
              <Link href={`/glossary/${guide.glossarySlug}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
                <BookOpen className="h-4 w-4" /> {guide.name} in the glossary
              </Link>
            )}
            <Link href="/breeding" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              All breeding guides
            </Link>
          </div>
          {sameClass.length > 0 && (
            <p className="mt-4 text-sm text-ocean-400">
              Also in {klass ? `Class ${klass.letter}` : "this class"}
              {guide.category ? ` ${guide.category.toLowerCase()}` : ""}:{" "}
              {sameClass.map((g, i) => (
                <span key={g.slug}>
                  {i > 0 && ", "}
                  <Link href={`/breeding/${g.slug}`} className="text-emerald-300 hover:underline">
                    {g.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** Members' own spawn reports (approved Society records). */
function ReportList({ reports, name }: { reports: Report[]; name: string }) {
  return (
    <div className="space-y-4">
      {reports.map((g) => {
        const date = fmtDate(g.event_date) ?? fmtDate(g.created_at);
        const photos = Array.isArray(g.photos) ? g.photos : [];
        return (
          <article key={g.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              {g.breeder_username ? (
                <Link href={`/u/${g.breeder_username}`} className="font-medium text-white hover:text-ocean-200">
                  {g.breeder_name || g.breeder_username}
                </Link>
              ) : (
                <span className="font-medium text-white">A Society member</span>
              )}
              <span className="text-ocean-500">·</span>
              {g.club_is_public ? (
                <Link href={`/c/${g.club_slug}`} className="text-ocean-400 hover:text-ocean-200">
                  {g.club_name}
                </Link>
              ) : (
                <span className="text-ocean-400">{g.club_name}</span>
              )}
              {date && (
                <>
                  <span className="text-ocean-500">·</span>
                  <span className="text-ocean-500">{date}</span>
                </>
              )}
            </div>
            {g.notes ? (
              <p className="mb-4 whitespace-pre-wrap text-ocean-200">{g.notes}</p>
            ) : (
              <p className="mb-4 italic text-ocean-500">No write-up provided.</p>
            )}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block h-28 w-28 overflow-hidden rounded-lg border border-ocean-800/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${name} photo ${i + 1}`} className="h-full w-full object-cover transition-transform hover:scale-105" />
                  </a>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

/** A fish members have bred that doesn't have a written guide yet. */
function ReportsOnly({ reports }: { reports: Report[] }) {
  const name = reports[0].species_name;
  const isPlant = reports[0].program === "hap";
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-ocean-400">
          <Link href="/breeding" className="hover:text-white">
            Breeding guides
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-ocean-200">{name}</span>
        </nav>
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          {isPlant ? <Leaf className="h-4 w-4" /> : <Egg className="h-4 w-4" />} Members&apos; reports
        </p>
        <h1 className="font-display text-3xl text-white sm:text-5xl">{name}</h1>
        <p className="mb-8 mt-2 text-ocean-300">
          {reports.length} {reports.length === 1 ? "report" : "reports"} from members who have bred {name}.
        </p>
        <ReportList reports={reports} name={name} />
      </div>
    </main>
  );
}

