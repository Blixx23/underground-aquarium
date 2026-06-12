import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { data } = await supabasePublic.from("glossary_terms").select("slug");
  return (data ?? []).map((t) => ({ slug: t.slug as string }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { data: term } = await supabasePublic
    .from("glossary_terms")
    .select("term, definition")
    .eq("slug", slug)
    .maybeSingle();

  if (!term) return { title: "Term not found" };

  return {
    title: term.term,
    description: term.definition,
    alternates: { canonical: `/glossary/${slug}` },
  };
}

export default async function TermPage({ params }: Params) {
  const { slug } = await params;

  const { data: term } = await supabasePublic
    .from("glossary_terms")
    .select("slug, term, category, definition, body")
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