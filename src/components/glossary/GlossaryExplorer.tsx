"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

type Term = {
  term: string;
  category: string;
  definition: string;
};

const CATEGORIES = [
  "Water Chemistry",
  "Cycling & Filtration",
  "Equipment",
  "Fish Health",
  "Plants & Aquascaping",
  "General",
] as const;

// --- Edit, add, or remove terms here -----------------------------------
const TERMS: Term[] = [
  { term: "Acclimation", category: "Fish Health", definition: "Slowly adjusting newly arrived fish to your tank's temperature and water before releasing them, to avoid shock." },
  { term: "Air Stone", category: "Equipment", definition: "A porous stone that diffuses air into fine bubbles, boosting surface agitation and oxygen exchange." },
  { term: "Algae", category: "Plants & Aquascaping", definition: "Photosynthetic growth that's natural in small amounts; an outbreak usually signals too much light or excess nutrients." },
  { term: "Ammonia", category: "Water Chemistry", definition: "A toxic nitrogen compound from fish waste, uneaten food, and decay. It's the first and most dangerous stage of the nitrogen cycle — harmful even at low levels." },
  { term: "Aquascaping", category: "Plants & Aquascaping", definition: "The art of arranging plants, rocks, and driftwood to create a beautiful underwater landscape." },
  { term: "Beneficial Bacteria", category: "Cycling & Filtration", definition: "The invisible workforce living in your filter and substrate that converts toxic waste into safer compounds." },
  { term: "Biological Filtration", category: "Cycling & Filtration", definition: "Filtration carried out by beneficial bacteria living on filter media — the heart of a healthy tank." },
  { term: "Bioload", category: "General", definition: "The total amount of waste produced by everything living in your tank. A higher bioload demands more filtration and maintenance." },
  { term: "Canister Filter", category: "Equipment", definition: "A powerful external filter, usually kept below the tank, favored for larger or heavily stocked aquariums." },
  { term: "Carpeting Plant", category: "Plants & Aquascaping", definition: "Low-growing plants that spread across the substrate to form a lush, lawn-like foreground." },
  { term: "Chemical Filtration", category: "Cycling & Filtration", definition: "Filtration that removes dissolved impurities, odors, and discoloration — activated carbon is the classic example." },
  { term: "CO2 Injection", category: "Plants & Aquascaping", definition: "Adding carbon dioxide to a planted tank to dramatically boost plant growth and color." },
  { term: "Cycling", category: "Cycling & Filtration", definition: "Establishing colonies of beneficial bacteria in a new tank so it can safely process fish waste before (or as) you add livestock." },
  { term: "Dechlorinator", category: "Water Chemistry", definition: "A water conditioner that neutralizes chlorine and chloramine in tap water, both toxic to fish and your beneficial bacteria." },
  { term: "DOA", category: "General", definition: "'Dead on Arrival' — livestock that doesn't survive shipping. Reputable sellers spell out their live-arrival guarantee up front." },
  { term: "Drip Acclimation", category: "Fish Health", definition: "A gentle acclimation method that slowly drips your tank water into the container holding new arrivals." },
  { term: "Fin Rot", category: "Fish Health", definition: "A bacterial infection that frays and erodes fins, often triggered by poor water quality or stress." },
  { term: "Fishless Cycling", category: "Cycling & Filtration", definition: "Cycling a tank using a bottled ammonia source instead of live fish, so no animals are stressed in the process." },
  { term: "Gravel Vacuum", category: "General", definition: "A siphon tool that removes debris from the substrate while you drain water during a change." },
  { term: "GH (General Hardness)", category: "Water Chemistry", definition: "The amount of calcium and magnesium dissolved in your water. It influences which fish, shrimp, and plants will thrive." },
  { term: "Hardscape", category: "Plants & Aquascaping", definition: "The non-living structure of an aquascape: the rocks and wood that form its bones." },
  { term: "Heater", category: "Equipment", definition: "A device that keeps your water at a stable temperature, essential for tropical fish." },
  { term: "HOB Filter", category: "Equipment", definition: "A 'hang-on-back' filter that hangs on the tank rim — popular for being affordable and easy to maintain." },
  { term: "Hospital Tank", category: "Fish Health", definition: "A simple, separate tank used to treat sick fish away from the main display." },
  { term: "Ich", category: "Fish Health", definition: "A common parasite ('white spot disease') that looks like grains of salt on fins and body. Usually treatable with raised temperature and medication." },
  { term: "Invertebrate", category: "General", definition: "Tank inhabitants without a backbone — shrimp, snails, and crabs — often prized for algae control and cleanup." },
  { term: "Iwagumi", category: "Plants & Aquascaping", definition: "A minimalist Japanese aquascaping style built around the careful arrangement of stones." },
  { term: "KH (Carbonate Hardness)", category: "Water Chemistry", definition: "Your water's buffering capacity — its ability to resist pH swings. Low KH can let pH crash unexpectedly." },
  { term: "Mechanical Filtration", category: "Cycling & Filtration", definition: "The stage that physically traps debris and particles, usually with sponge or filter floss." },
  { term: "Mini-Cycle", category: "Cycling & Filtration", definition: "A brief re-spike of ammonia or nitrite after your bacteria colony is disturbed — for example, after over-cleaning the filter." },
  { term: "New Tank Syndrome", category: "Cycling & Filtration", definition: "Fish illness or death caused by adding them to an un-cycled tank, where ammonia and nitrite spike to toxic levels." },
  { term: "Nitrate", category: "Water Chemistry", definition: "The relatively harmless end product of the nitrogen cycle. It builds up over time and is kept in check with water changes and live plants." },
  { term: "Nitrite", category: "Water Chemistry", definition: "The second stage of the nitrogen cycle, produced as bacteria break down ammonia. Still toxic, so any detectable amount is a warning sign." },
  { term: "Nitrogen Cycle", category: "Cycling & Filtration", definition: "The natural process where bacteria convert toxic ammonia into nitrite, then into far less harmful nitrate. The single most important concept in fishkeeping." },
  { term: "Overstocking", category: "General", definition: "Keeping more fish than your tank and filter can healthily handle — a common cause of water-quality problems." },
  { term: "pH", category: "Water Chemistry", definition: "A 0–14 scale of how acidic or alkaline your water is. Most freshwater fish do well between 6.5 and 7.5, but stability matters more than an exact number." },
  { term: "Powerhead", category: "Equipment", definition: "A small submersible pump that adds water movement and circulation." },
  { term: "Quarantine (QT)", category: "Fish Health", definition: "Keeping new or sick fish in a separate tank for a few weeks to stop disease from reaching your main aquarium." },
  { term: "Root Tabs", category: "Plants & Aquascaping", definition: "Fertilizer capsules pushed into the substrate to feed root-hungry plants." },
  { term: "Schooling Fish", category: "General", definition: "Species that feel safe and behave naturally only when kept in groups, often of six or more." },
  { term: "Sponge Filter", category: "Equipment", definition: "A simple, gentle air-driven filter ideal for fry, shrimp, and quarantine tanks." },
  { term: "Stocking", category: "General", definition: "How many and which species your tank can comfortably support." },
  { term: "Substrate", category: "Equipment", definition: "The material covering the tank bottom — gravel, sand, or nutrient-rich aquasoil for planted tanks." },
  { term: "Swim Bladder", category: "Fish Health", definition: "The organ fish use to control buoyancy. When it malfunctions, a fish may float, sink, or swim oddly." },
  { term: "TDS", category: "Water Chemistry", definition: "Total Dissolved Solids: a quick measure of everything dissolved in your water, from minerals to salts. Useful for sensitive species like shrimp." },
  { term: "Water Change", category: "General", definition: "Replacing a portion of tank water with fresh, conditioned water — the most important routine maintenance you'll do." },
];
// -----------------------------------------------------------------------

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function GlossaryExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TERMS.filter((t) => {
      const matchesCategory = category === "All" || t.category === category;
      const matchesQuery =
        q === "" ||
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [query, category]);

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
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-4">
            Knowledge Base
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-4">
            The Aquarium Glossary
          </h1>
          <p className="text-ocean-200 text-lg">
            Every term a fishkeeper needs, in plain English. Search it, filter by
            topic, or jump straight to a letter.
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

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {["All", ...CATEGORIES].map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={
                  "px-3.5 py-1.5 rounded-full text-sm border transition-colors " +
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

        {/* A–Z jump bar */}
        <div className="flex flex-wrap gap-1 mb-6 pb-6 border-b border-white/10">
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
          {filtered.length === TERMS.length
            ? `${TERMS.length} terms`
            : `${filtered.length} of ${TERMS.length} terms`}
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
              <section key={letter} id={`letter-${letter}`} className="scroll-mt-28">
                <h2 className="font-display text-2xl text-emerald-400 mb-4">
                  {letter}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped.get(letter)!.map((t) => (
                    <div
                      key={t.term}
                      className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition-colors"
                    >
                      <h3 className="text-white font-medium">{t.term}</h3>
                      <span className="inline-block mt-1.5 mb-2 text-xs uppercase tracking-wide text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                        {t.category}
                      </span>
                      <p className="text-ocean-300 text-sm leading-relaxed">
                        {t.definition}
                      </p>
                    </div>
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