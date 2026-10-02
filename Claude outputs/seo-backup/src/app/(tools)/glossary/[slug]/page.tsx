import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import RelatedGuides from "@/components/discover/RelatedGuides";
import { relatedThreads } from "@/lib/discover";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

type Section = { heading: string; text: string };
type Faq = { q: string; a: string };

export async function generateStaticParams() {
  const { data } = await supabasePublic.from("glossary_terms").select("slug");
  return (data ?? []).map((t) => ({ slug: t.slug as string }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { data: term } = await supabasePublic
    .from("glossary_terms")
    .select("term, definition, seo_title")
    .eq("slug", slug)
    .maybeSingle();

  // Before the page streams, so a missing term is a real 404 to Google.
  if (!term) notFound();

  // People search "what is brackish water", so lead with the question.
  const title = (term.seo_title as string | null) || `What Is ${term.term}? Meaning for Fish Tanks`;
  return {
    title,
    description: term.definition,
    openGraph: { title, description: term.definition, url: `/glossary/${slug}`, type: "article" },
    alternates: { canonical: `/glossary/${slug}` },
  };
}

export default async function TermPage({ params }: Params) {
  const { slug } = await params;

  const { data: term } = await supabasePublic
    .from("glossary_terms")
    .select("slug, term, category, definition, body, sections, faq")
    .eq("slug", slug)
    .maybeSingle();

  if (!term) notFound();

  const { data: related } = await supabasePublic
    .from("glossary_terms")
    .select("slug, term")
    .eq("category", term.category)
    .neq("slug", term.slug)
    .order("term")
    .limit(8);

  const guides = await relatedThreads({ terms: [term.term as string], limit: 4 });

  const sections = (Array.isArray(term.sections) ? term.sections : []) as Section[];
  const faq = (Array.isArray(term.faq) ? term.faq : []) as Faq[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.definition,
    inDefinedTermSet: "https://www.undergroundaquarium.com/glossary",
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-ocean-400 mb-8">
          <Link href="/glossary" className="hover:text-white transition-colors">
            Glossary
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-ocean-200">{term.term}</span>
        </nav>

        <span className="inline-block text-xs uppercase tracking-wide text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 mb-4">
          {term.category}
        </span>

        <h1 className="font-display text-4xl sm:text-5xl text-white mb-5">
          {term.term}
        </h1>

        <p className="text-ocean-200 text-lg leading-relaxed mb-5">
          {term.definition}
        </p>
        <p className="text-ocean-300 leading-relaxed mb-10">{term.body}</p>

        {/* The full write-up, where a term has one. */}
        {sections.length > 0 && (
          <div className="mb-10 space-y-8">
            {sections.map((sec) => (
              <section key={sec.heading}>
                <h2 className="font-display text-2xl text-white mb-3">{sec.heading}</h2>
                {sec.text.split(/\n\n+/).map((para, i) =>
                  para.trim().startsWith("- ") ? (
                    <ul key={i} className="mb-3 list-disc space-y-1.5 pl-5 text-ocean-200 leading-relaxed">
                      {para
                        .split(/\n/)
                        .map((l) => l.replace(/^-\s*/, "").trim())
                        .filter(Boolean)
                        .map((l, j) => (
                          <li key={j}>{l}</li>
                        ))}
                    </ul>
                  ) : (
                    <p key={i} className="mb-3 text-ocean-200 leading-relaxed">
                      {para}
                    </p>
                  )
                )}
              </section>
            ))}
          </div>
        )}

        {faq.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-2xl text-white mb-4">Common questions</h2>
            <dl className="space-y-5">
              {faq.map((f) => (
                <div key={f.q} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                  <dt className="font-medium text-white">{f.q}</dt>
                  <dd className="mt-1.5 text-ocean-200 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="-mt-6 mb-10 flex flex-wrap gap-2">
          <Link
            href="/water-check"
            className="inline-flex items-center gap-1.5 rounded-xl bg-ocean-600 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-500"
          >
            Check your water
          </Link>
          <Link
            href="/forums/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-ocean-700/60 px-4 py-2 text-sm text-ocean-200 hover:border-ocean-500 hover:text-white"
          >
            Ask the forums
          </Link>
        </div>

        <RelatedGuides guides={guides} title={`Guides mentioning ${term.term}`} />
        <div className="h-8" />

        {related && related.length > 0 && (
          <div className="border-t border-white/10 pt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
              Related terms in {term.category}
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/glossary/${r.slug}`}
                  className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-ocean-200 hover:text-white hover:border-emerald-500/40 transition-colors"
                >
                  {r.term}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <Link
            href="/glossary"
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to the glossary
          </Link>
        </div>
      </div>
    </main>
  );
}