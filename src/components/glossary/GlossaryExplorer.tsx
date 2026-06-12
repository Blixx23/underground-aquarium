"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Filter, ChevronDown } from "lucide-react";

type Term = {
  slug: string;
  term: string;
  category: string;
  definition: string;
};

const CATEGORY_ORDER = [
  "Water Chemistry",
  "Nitrogen Cycle & Filtration",
  "Equipment",
  "Fish Health & Disease",
  "Fish Behavior & Biology",
  "Plants & Aquascaping",
  "Invertebrates",
  "Breeding",
  "Food & Nutrition",
  "Maintenance",
  "Water Types & Setup",
  "General & Hobby",
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function GlossaryExplorer({ terms }: { terms: Term[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    const present = new Set(terms.map((t) => t.category));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    const extras = [...present]
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .sort();
    return [...ordered, ...extras];
  }, [terms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return terms
      .filter((t) => {
        const matchesCategory = category === "All" || t.category === category;
        const matchesQuery =
          q === "" ||
          t.term.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [terms, query, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, Term[]>();
    for (const t of filtered) {
      const first = t.term[0].toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [filtered]);

  const availableLetters = useMemo(() => new Set(grouped.keys()), [grouped]);

  function jumpTo(letter: string) {
    const el = document.getElementById(`letter-${letter}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-6">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Knowledge Base
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            The Aquarium Glossary
          </h1>
          <p className="text-ocean-300">
            {terms.length} fishkeeping terms in plain English. Search, filter by
            topic, or jump to a letter.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms or definitions…"
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-12 pr-11 py-3.5 text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40 focus:bg-white/10 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ocean-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="sm:hidden w-full flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-ocean-200 mb-4"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {category === "All" ? "Filter by topic" : category}
          </span>
          <ChevronDown
            className={
              "w-4 h-4 transition-transform " + (showFilters ? "rotate-180" : "")
            }
          />
        </button>

        {/* Category chips — collapsible on mobile, always shown on desktop */}
        <div className={(showFilters ? "block" : "hidden") + " sm:block"}>
          <div className="flex flex-wrap gap-2 mb-4">
            {["All", ...categories].map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setShowFilters(false);
                  }}
                  className={
                    "px-3 py-1 rounded-full text-sm border transition-colors " +
                    (active
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-ocean-300 hover:text-white hover:border-white/20")
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* A–Z jump bar — desktop only */}
        <div className="hidden sm:flex flex-wrap gap-1 mb-4 pb-4 border-b border-white/10">
          {ALPHABET.map((letter) => {
            const has = availableLetters.has(letter);
            return (
              <button
                key={letter}
                onClick={() => has && jumpTo(letter)}
                disabled={!has}
                className={
                  "w-7 h-7 rounded-md text-sm font-medium transition-colors " +
                  (has
                    ? "text-ocean-200 hover:bg-emerald-500/15 hover:text-emerald-300"
                    : "text-white/20 cursor-default")
                }
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Result count */}
        <p className="text-ocean-400 text-sm mb-6">
          {filtered.length === terms.length
            ? `${terms.length} terms`
            : `${filtered.length} of ${terms.length} terms`}
        </p>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <p className="text-white font-medium mb-1">No terms found</p>
            <p className="text-ocean-400 text-sm">
              Try a different search or clear your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {[...grouped.keys()].sort().map((letter) => (
              <section
                key={letter}
                id={`letter-${letter}`}
                className="scroll-mt-28"
              >
                <h2 className="font-display text-2xl text-emerald-400 mb-4">
                  {letter}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped.get(letter)!.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/glossary/${t.slug}`}
                      className="block rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                    >
                      <h3 className="text-white font-medium">{t.term}</h3>
                      <span className="inline-block mt-1.5 mb-2 text-xs uppercase tracking-wide text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                        {t.category}
                      </span>
                      <p className="text-ocean-300 text-sm leading-relaxed">
                        {t.definition}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}