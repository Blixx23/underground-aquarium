import type { Metadata } from "next";
import Link from "next/link";
import { GitMerge } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { loadCrosses, OUTCOME_LABEL } from "@/lib/species/crosses";
import { shareMeta } from "@/lib/seo/share";
import { ldJson } from "@/lib/jsonLd";

export const revalidate = 3600;

const SITE = "https://www.undergroundaquarium.com";
const TITLE = "Which Aquarium Fish Can Crossbreed? Hybrids to Know";
const DESCRIPTION =
  "A short, fact-checked list of aquarium fish and shrimp that crossbreed: guppies and Endler's, platies and swordtails, mbuna, bee and tiger shrimp and more, and whether the young are fertile.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/breeding/crossbreeding" },
  ...shareMeta({ path: "/breeding/crossbreeding", alt: "Aquarium fish that can crossbreed" }),
};

type Sp = { slug: string; common_name: string; scientific_name: string | null; group_name: string | null };

export default async function CrossbreedingPage() {
  const rows = await loadCrosses();
  const slugs = [...new Set(rows.flatMap((r) => [r.species_a, r.species_b, r.result_slug ?? ""]).filter(Boolean))];
  const { data } = slugs.length
    ? await supabasePublic.from("species").select("slug, common_name, scientific_name, group_name").in("slug", slugs)
    : { data: [] as Sp[] };
  const sp = new Map(((data ?? []) as Sp[]).map((s) => [s.slug, s]));
  const name = (slug: string) => sp.get(slug)?.common_name ?? slug.replace(/-/g, " ");

  // Grouped by the first fish's group, in a stable order.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const g = sp.get(r.species_a)?.group_name ?? "Other";
    groups.set(g, [...(groups.get(g) ?? []), r]);
  }
  const ordered = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const faq = rows.map((r) => ({
    q: `Can ${name(r.species_a)} and ${name(r.species_b)} crossbreed?`,
    a: `Yes. ${r.note}`,
  }));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Breeding guides", item: `${SITE}/breeding` },
        { "@type": "ListItem", position: 3, name: "Crossbreeding", item: `${SITE}/breeding/crossbreeding` },
      ],
    },
  ];

  return (
    <main className="min-h-screen px-6 pb-20 pt-24 sm:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ocean-400">
          <Link href="/breeding" className="hover:text-white">
            Breeding guides
          </Link>{" "}
          / Crossbreeding
        </nav>
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-300">
          <GitMerge className="h-4 w-4" /> Crossbreeding
        </p>
        <h1 className="font-display text-3xl text-white sm:text-4xl">Which aquarium fish can crossbreed?</h1>
        <p className="mt-3 text-ocean-200">
          These are the pairs in our library that are known to produce hybrids. We only list crosses that are well documented, so
          the list is short on purpose. Keep only one of each pair in a tank if you want to breed true.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-ocean-300">
          <li>Color forms of the same species always interbreed: a red cherry shrimp and a blue dream, or two platy colors.</li>
          <li>Cherry shrimp (Neocaridina) and bee or crystal shrimp (Caridina) do not cross.</li>
        </ul>

        {ordered.map(([group, list]) => (
          <section key={group} className="mt-8">
            <h2 className="mb-3 font-display text-xl text-white">{group}</h2>
            <ul className="space-y-2">
              {list.map((r) => (
                <li key={`${r.species_a}-${r.species_b}`} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3">
                  <p className="font-medium text-white">
                    <Link href={`/species/${r.species_a}`} className="hover:text-emerald-200">
                      {name(r.species_a)}
                    </Link>
                    <span className="mx-1.5 text-ocean-500">x</span>
                    <Link href={`/species/${r.species_b}`} className="hover:text-emerald-200">
                      {name(r.species_b)}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-sky-300">
                    {OUTCOME_LABEL[r.outcome]}
                    {r.result_slug && (
                      <>
                        {" · makes the "}
                        <Link href={`/species/${r.result_slug}`} className="underline underline-offset-2 hover:text-white">
                          {name(r.result_slug)}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-ocean-300">{r.note}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-10 text-sm text-ocean-400">
          Know of a well-documented cross we've missed, or think one here is wrong? Email support@undergroundaquarium.com with a
          source and we'll check it.
        </p>
      </div>
    </main>
  );
}
