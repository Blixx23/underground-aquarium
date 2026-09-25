import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import TankBuilder from "@/components/tank-builder/TankBuilder";
import { loadBuilderSpecies } from "@/lib/tankBuilder/species";
import { computeEquipment, galToL } from "@/lib/tankBuilder/engine";
import { fitLists, stockPlans } from "@/lib/tankBuilder/plans";
import { TANK_SIZES, filledWeightLb, sizeBySlug, waterWeightLb } from "@/lib/tankBuilder/sizes";
import { buildPath } from "@/lib/tankBuilder/share";
import { breadcrumbJsonLd, ldJson, SITE } from "@/lib/marketplace/seo";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return TANK_SIZES.map((t) => ({ size: t.slug }));
}

type Props = { params: Promise<{ size: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { size } = await params;
  const t = sizeBySlug(size);
  if (!t) notFound();
  const e = computeEquipment(t.gallons, 50, false);
  const title = `${t.gallons} Gallon Tank Stocking Ideas, Heater & Filter Size`;
  const description = `What fish can go in a ${t.gallons} gallon tank? Stocking plans checked for compatibility, plus the heater (${e.heaterWattsLow}-${e.heaterWattsHigh} W), filter (${e.filterGphLow}-${e.filterGphHigh} GPH), dimensions and weight of a ${t.gallons} gallon aquarium.`;
  return {
    title,
    description,
    alternates: { canonical: `/tank-builder/${t.slug}` },
    openGraph: { title, description, url: `${SITE}/tank-builder/${t.slug}`, type: "article" },
  };
}

export default async function TankSizePage({ params }: Props) {
  const { size } = await params;
  const t = sizeBySlug(size);
  if (!t) notFound();

  const species = await loadBuilderSpecies();
  const g = t.gallons;
  const e = computeEquipment(g, 50, false);
  const eMessy = computeEquipment(g, 100, true);
  const plans = stockPlans(g, species, 3);
  const { fits, tooBig } = fitLists(g, species);
  const [L, W, H] = t.dims;
  // A 2" gravel bed over the footprint; gravel weighs about 0.058 lb per cubic inch.
  const gravelLb = Math.round(L * W * 2 * 0.058);
  const litres = Math.round(galToL(g));
  const idx = TANK_SIZES.findIndex((x) => x.slug === t.slug);
  const prev = TANK_SIZES[idx - 1];
  const next = TANK_SIZES[idx + 1];

  const faqs: { q: string; a: string }[] = [
    {
      q: `How many fish can go in a ${g} gallon tank?`,
      a:
        plans.length > 0
          ? `It depends on the fish, not a fixed number. A good example for a ${g} gallon is ${plans[0].summary}, which comes to about ${plans[0].stockingPct}% of a cautious stocking limit. Small, tidy fish like tetras and rasboras let you keep more; messy fish like goldfish and plecos fill a tank much faster.`
          : `A ${g} gallon tank is best kept very lightly stocked: a single small fish, or a shrimp and snail colony. Add your plan to the Tank Builder to check it.`,
    },
    {
      q: `What size heater do I need for a ${g} gallon tank?`,
      a: `A ${e.heaterWattsLow} to ${e.heaterWattsHigh} watt heater. Go toward ${e.heaterWattsHigh} W if the room runs cool.${
        g >= 75 ? " At this size, two smaller heaters at opposite ends are safer and heat more evenly than one big one." : ""
      }`,
    },
    {
      q: `What size filter does a ${g} gallon tank need?`,
      a: `Look for ${e.filterGphLow} to ${e.filterGphHigh} gallons per hour of flow. For messy fish or a busy tank, go up to about ${eMessy.filterGphHigh} GPH.`,
    },
    {
      q: `What are the dimensions of a ${g} gallon tank?`,
      a: `A standard ${g} gallon is about ${L}" long, ${W}" wide and ${H}" tall.${t.alt ? ` Another common version is the ${t.alt}.` : ""} Brands vary slightly, so measure before buying a stand or lid.`,
    },
    {
      q: `How much does a ${g} gallon tank weigh?`,
      a: `The water alone weighs about ${waterWeightLb(g).toLocaleString()} lb. With glass, gravel and decor, plan on roughly ${filledWeightLb(
        g
      ).toLocaleString()} lb, so use a stand made for aquariums.`,
    },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Tank Builder", path: "/tank-builder" },
    { name: `${g} gallon tank`, path: `/tank-builder/${t.slug}` },
  ]);
  const planList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${g} gallon tank stocking ideas`,
    itemListElement: plans.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      description: p.summary,
      url: `${SITE}${buildPath(g, p.items.map((it) => ({ slug: it.species.slug, qty: it.qty })))}`,
    })),
  };

  const facts: [string, string][] = [
    ["Dimensions", `${L}" × ${W}" × ${H}"`],
    ["Volume", `${g} gal · ${litres} L`],
    ["Heater", `${e.heaterWattsLow}-${e.heaterWattsHigh} W`],
    ["Filter flow", `${e.filterGphLow}-${e.filterGphHigh} GPH`],
    ["Filled weight", `~${filledWeightLb(g).toLocaleString()} lb`],
    ["Gravel (2\" bed)", `~${gravelLb} lb`],
    ["Weekly water change", `${Math.round(g * 0.25 * 10) / 10} gal (25%)`],
    ["Water weight", `${waterWeightLb(g).toLocaleString()} lb`],
  ];

  return (
    <main className="font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(crumbs) }} />
      {plans.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(planList) }} />}

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ocean-400">
        <Link href="/tank-builder" className="hover:text-white">
          Tank Builder
        </Link>{" "}
        <span aria-hidden="true">›</span> <span className="text-ocean-200">{g} gallon tank</span>
      </nav>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">Tank size guide</p>
        <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">
          {g} Gallon Tank: Stocking Ideas, Heater &amp; Filter Size
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ocean-200">{t.blurb}</p>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <dt className="text-[11px] uppercase tracking-wide text-ocean-400">{k}</dt>
            <dd className="mt-0.5 text-[15px] font-semibold text-white">{v}</dd>
          </div>
        ))}
      </dl>

      {plans.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl text-white sm:text-3xl">{g} gallon stocking ideas</h2>
          <p className="mt-2 max-w-3xl text-[15px] text-ocean-200">
            Each plan passes the Tank Builder&apos;s compatibility check with no conflicts and room to spare. Open one to
            tweak it.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <article key={p.title} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold text-white">{p.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {p.items.map((it) => (
                    <li key={it.species.slug} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-ocean-100">
                        {it.qty} ×{" "}
                        <Link href={`/species/${it.species.slug}`} className="text-white underline-offset-2 hover:underline">
                          {it.species.common_name}
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between gap-3 pt-2 text-xs">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
                    {p.stockingPct}% stocked
                  </span>
                  <Link
                    href={buildPath(g, p.items.map((it) => ({ slug: it.species.slug, qty: it.qty })))}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-emerald-200"
                  >
                    Open in builder <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <TankBuilder species={species} initialGallons={g} embedded />
      </section>

      {fits.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl text-white sm:text-3xl">Fish that fit a {g} gallon tank</h2>
          <p className="mt-2 max-w-3xl text-[15px] text-ocean-200">
            Popular freshwater species whose recommended minimum is {g} gallons or less. Check they get along in the
            builder before you buy.
          </p>
          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {fits.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/species/${s.slug}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-white/25"
                >
                  <span className="block truncate text-sm font-medium text-white">{s.common_name}</span>
                  <span className="block truncate text-xs text-ocean-400">
                    {[s.max_size_in ? `${s.max_size_in}"` : null, `${s.min_tank_gal}+ gal`, s.min_group_size && s.min_group_size > 1 ? `groups of ${s.min_group_size}+` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tooBig.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl text-white sm:text-2xl">Popular fish that need more than {g} gallons</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {tooBig.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/species/${s.slug}`}
                  className="inline-block rounded-full border border-amber-500/25 bg-amber-500/[0.06] px-3 py-1.5 text-sm text-amber-100 hover:bg-amber-500/10"
                >
                  {s.common_name} <span className="text-amber-300/80">({s.min_tank_gal}+ gal)</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <h2 className="font-display text-2xl text-white sm:text-3xl">{g} gallon tank FAQ</h2>
        <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
          {faqs.map((f) => (
            <div key={f.q} className="px-5 py-4">
              <h3 className="text-[15px] font-semibold text-white">{f.q}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ocean-200">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <nav aria-label="Other tank sizes" className="mt-14">
        <h2 className="font-display text-xl text-white">Other tank sizes</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {TANK_SIZES.map((x) => (
            <Link
              key={x.slug}
              href={`/tank-builder/${x.slug}`}
              aria-current={x.slug === t.slug ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${
                x.slug === t.slug
                  ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                  : "border-white/10 text-ocean-200 hover:border-white/25 hover:text-white"
              }`}
            >
              {x.gallons} gallon
            </Link>
          ))}
        </div>
        <div className="mt-5 flex justify-between gap-3 text-sm">
          {prev ? (
            <Link href={`/tank-builder/${prev.slug}`} className="text-emerald-300 hover:text-emerald-200">
              ← {prev.gallons} gallon
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/tank-builder/${next.slug}`} className="text-emerald-300 hover:text-emerald-200">
              {next.gallons} gallon →
            </Link>
          )}
        </div>
      </nav>
    </main>
  );
}
