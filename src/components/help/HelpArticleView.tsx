import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import HelpSearch from "@/components/help/HelpSearch";
import HelpMarkdown from "@/components/help/HelpMarkdown";
import StillStuck from "@/components/help/StillStuck";
import { CategoryIcon } from "@/components/help/categoryIcon";
import type { HelpArticle } from "@/lib/help/content";

/**
 * One help article, shared by member help (/help/...) and admin help
 * (/admin/help/...). The page decides who may see it; this only draws it.
 */
export default function HelpArticleView({
  article: a,
  related,
  base,
  indexUrl,
  backLabel,
  showStillStuck = true,
}: {
  article: HelpArticle;
  related: { slug: string; title: string; summary: string }[];
  base: string;
  indexUrl: string;
  backLabel: string;
  showStillStuck?: boolean;
}) {
  const toc = a.sections.filter((s) => s.anchor);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href={base} className="inline-flex items-center gap-1 text-sm text-ocean-300 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <div className="w-full sm:max-w-sm">
          <HelpSearch placeholder="Search help…" indexUrl={indexUrl} base={base} />
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

          {related.length > 0 && (
            <section className="mt-12 border-t border-ocean-800/60 pt-8">
              <h2 className="font-display text-xl text-white">More in {a.category}</h2>
              <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {related.map((x) => (
                  <li key={x.slug}>
                    <Link
                      href={`${base}/${x.slug}`}
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

          {showStillStuck && <StillStuck />}
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
  );
}
