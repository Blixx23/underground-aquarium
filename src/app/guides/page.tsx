import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, MessageSquare } from "lucide-react";
import { getGuides, type Guide } from "@/lib/forum/guides";
import { shareMeta } from "@/lib/seo/share";

export const metadata: Metadata = {
  title: "Fishkeeping Guides",
  description:
    "Plain-English fishkeeping guides: fish health, freshwater, plants, saltwater, equipment and breeding. Each one is open for questions in the forums.",
  alternates: { canonical: "/guides" },
  ...shareMeta({ path: "/guides", alt: "Underground Aquarium fishkeeping guides" }),
};

// New guides show within the hour without a deploy.
export const revalidate = 3600;

export default async function GuidesPage() {
  const guides = await getGuides();
  const byCat = new Map<string, { name: string; slug: string; items: Guide[] }>();
  for (const g of guides) {
    const c = byCat.get(g.categorySlug) ?? { name: g.categoryName, slug: g.categorySlug, items: [] };
    c.items.push(g);
    byCat.set(g.categorySlug, c);
  }
  const groups = [...byCat.values()].sort((a, b) => b.items.length - a.items.length);

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-emerald-400">
          <BookOpen className="h-4 w-4" /> Guides
        </p>
        <h1 className="font-display text-3xl text-white sm:text-5xl">Fishkeeping guides</h1>
        <p className="mt-3 max-w-2xl text-ocean-300">
          {guides.length} how-to guides from Underground Aquarium. Each one lives in the forums, so if something
          doesn&apos;t fit your tank, ask right under it and the community will help.
        </p>

        {/* Standalone guides that live outside the forums. */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/ich-in-fish" className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/20">
            Ich (white spot) treatment
          </Link>
          <Link href="/fish-swaps" className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/20">
            Fish swaps near you
          </Link>
          <Link href="/where-to-sell-aquarium-fish" className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/20">
            Where to sell aquarium fish
          </Link>
        </div>

        {groups.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-ocean-800/60 p-10 text-center text-ocean-400">
            Guides are on their way.
          </p>
        ) : (
          <div className="mt-10 space-y-10">
            {groups.map((g) => (
              <section key={g.slug}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-xl text-white">{g.name}</h2>
                  <Link href={`/forums/${g.slug}`} className="text-sm text-ocean-400 hover:text-white">
                    {g.name} forum →
                  </Link>
                </div>
                <ul className="divide-y divide-ocean-800/60 overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
                  {g.items.map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/forums/${t.categorySlug}/${t.slug}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="text-white">{t.title}</span>
                        {t.replies > 0 && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ocean-400">
                            <MessageSquare className="h-3.5 w-3.5" /> {t.replies}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-12 text-sm text-ocean-400">
          Looking for help with the site itself? See the{" "}
          <Link href="/help" className="text-emerald-300 hover:text-emerald-200">
            Help Center
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
