import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import HelpSearch from "@/components/help/HelpSearch";
import HelpMarkdown from "@/components/help/HelpMarkdown";
import StillStuck from "@/components/help/StillStuck";
import { CategoryIcon } from "@/components/help/categoryIcon";
import { getHelpArticle, getHelpArticles } from "@/lib/help/content";
import { breadcrumbJsonLd, ldJson, SITE } from "@/lib/marketplace/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getHelpArticles().map((a) => ({ slug: a.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getHelpArticle(slug);
  if (!a) notFound();
  const title = `${a.title} | Help`;
  return {
    title,
    description: a.summary,
    alternates: { canonical: `/help/${a.slug}` },
    openGraph: { title, description: a.summary, url: `${SITE}/help/${a.slug}`, type: "article" },
  };
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = getHelpArticle(slug);
  if (!a) notFound();

  const all = getHelpArticles();
  const sameCategory = all.filter((x) => x.category === a.category && x.slug !== a.slug);
  const toc = a.sections.filter((s) => s.anchor);

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbJsonLd([
              { name: "Help Center", path: "/help" },
              { name: a.title, path: `/help/${a.slug}` },
            ])
          ),
        }}
      />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/help" className="inline-flex items-center gap-1 text-sm text-ocean-300 hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Help Center
          </Link>
          <div className="w-full sm:max-w-sm">
            <HelpSearch placeholder="Search help…" />
          </div>
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
          <article className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-emerald-400">
              <CategoryIcon category={a.category} className="h-4 w-4" />
              {a.category}
            </p>
            <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">{a.title}</h1>

            {toc.length > 2 && (
              <nav
                aria-label="In this article"
                className="mt-6 rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-4 lg:hidden"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-ocean-400">In this article</p>
                <ul className="mt-2 space-y-1.5">
                  {toc.map((s) => (
                    <li key={s.anchor}>
                      <a href={`#${s.anchor}`} className="text-sm text-ocean-200 hover:text-emerald-300">
                        {s.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div className="mt-6">
              <HelpMarkdown>{a.body}</HelpMarkdown>
            </div>

            {sameCategory.length > 0 && (
              <section className="mt-12 border-t border-ocean-800/60 pt-8">
                <h2 className="font-display text-xl text-white">More in {a.category}</h2>
                <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {sameCategory.map((x) => (
                    <li key={x.slug}>
                      <Link
                        href={`/help/${x.slug}`}
                        title={x.summary}
                        className="-mx-2 block rounded-lg px-2 py-1.5 text-sm text-ocean-200 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        {x.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <StillStuck />
          </article>

          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <nav aria-label="In this article" className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
                <p className="text-xs font-medium uppercase tracking-wider text-ocean-400">In this article</p>
                <ul className="mt-3 space-y-2 border-l border-ocean-800/60">
                  {toc.map((s) => (
                    <li key={s.anchor}>
                      <a
                        href={`#${s.anchor}`}
                        className="-ml-px block border-l border-transparent pl-3 text-sm leading-snug text-ocean-300 hover:border-emerald-400 hover:text-white"
                      >
                        {s.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
