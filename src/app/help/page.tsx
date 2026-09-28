import type { Metadata } from "next";
import Link from "next/link";
import HelpSearch from "@/components/help/HelpSearch";
import StillStuck from "@/components/help/StillStuck";
import { CategoryIcon } from "@/components/help/categoryIcon";
import { getHelpArticles } from "@/lib/help/content";
import { HELP_CATEGORIES } from "@/lib/help/types";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Answers for Underground Aquarium: posting free classifieds, messaging, forums, the Society, Tank Builder, Water Check, fish stores and your account.",
  alternates: { canonical: "/help" },
};

// Built once per deploy from content/help/*.md.
export const dynamic = "force-static";

const POPULAR: { label: string; href: string }[] = [
  { label: "Post a free ad", href: "/help/posting-a-classified-ad" },
  { label: "Mark as sold", href: "/help/marking-sold-and-deleting#how-do-i-mark-a-listing-as-sold" },
  { label: "Message a seller", href: "/help/contacting-a-seller#how-do-i-message-a-seller" },
  { label: "Claim my store", href: "/help/claiming-your-store#how-do-i-claim-my-store" },
  { label: "Join the Society", href: "/help/joining-the-society" },
  { label: "Reset password", href: "/help/signing-in-and-passwords#i-forgot-my-password-how-do-i-reset-it" },
  { label: "Tank Builder warnings", href: "/help/tank-builder-compatibility-warnings" },
];

export default function HelpPage() {
  const articles = getHelpArticles();
  const answers = articles.reduce((n, a) => n + a.sections.filter((s) => s.anchor).length, 0);

  const known = new Set<string>(HELP_CATEGORIES);
  const order = [
    ...HELP_CATEGORIES,
    ...Array.from(new Set(articles.map((a) => a.category))).filter((c) => !known.has(c)),
  ];
  const groups = order
    .map((category) => ({ category, articles: articles.filter((a) => a.category === category) }))
    .filter((g) => g.articles.length > 0);

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Not overflow-hidden: the results panel has to hang below the hero. */}
        <section className="rounded-3xl border border-ocean-800/60 bg-gradient-to-br from-ocean-900/70 via-ocean-950/80 to-emerald-950/30 p-6 shadow-xl sm:p-10">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">Help Center</p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">How can we help?</h1>
          <p className="mt-3 max-w-2xl text-ocean-300">
            {answers.toLocaleString("en-US")} answers across {articles.length} guides, covering every part of
            Underground Aquarium.
          </p>
          <div className="mt-6">
            <HelpSearch />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ocean-400">Popular:</span>
            {POPULAR.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-full border border-ocean-700/60 bg-white/[0.03] px-3 py-1 text-xs text-ocean-200 transition hover:border-emerald-500/50 hover:text-white"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </section>

        <h2 className="mt-12 font-display text-2xl text-white">Browse by topic</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <section
              key={g.category}
              id={g.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
              className="scroll-mt-28 rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <CategoryIcon category={g.category} className="h-[18px] w-[18px]" />
                </span>
                <h3 className="font-medium text-white">{g.category}</h3>
                <span className="ml-auto text-xs text-ocean-500">{g.articles.length}</span>
              </div>
              <ul className="mt-4 space-y-1">
                {g.articles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/help/${a.slug}`}
                      title={a.summary}
                      className="-mx-2 block rounded-lg px-2 py-1.5 text-sm text-ocean-200 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <StillStuck />
      </div>
    </main>
  );
}
