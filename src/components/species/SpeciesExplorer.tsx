"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Filter, ChevronDown } from "lucide-react";

type Species = {
  slug: string;
  entry_type: string;
  common_name: string;
  scientific_name: string | null;
  also_known_as: string[] | null;
  former_names: string[] | null;
  trade_codes: string[] | null;
  group_name: string | null;
  max_size_in: number | null;
  min_tank_gal: number | null;
  temp_min_f: number | null;
  temp_max_f: number | null;
  care_level: string | null;
  suitability: string | null;
};

const GROUP_ORDER = [
  "Tetras & Characins",
  "Rasboras & Small Cyprinids",
  "Danios",
  "Barbs",
  "Livebearers",
  "Gouramis & Bettas",
  "Corydoras & Relatives",
  "Other Catfish",
  "Plecos (L-number Catfish)",
  "Loaches",
  "Cichlids - New World",
  "Cichlids - African Rift Lake",
  "Rainbowfish",
  "Killifish",
  "Oddballs & Specialty",
  "Goldfish & Coldwater",
  "Shrimp",
  "Snails",
  "Crayfish",
];

function suitabilityStyle(s: string | null) {
  if (s === "Kept but not recommended")
    return "text-amber-300 bg-amber-500/10 border-amber-500/30";
  if (s === "Expert" || s === "Advanced")
    return "text-ocean-200 bg-white/5 border-white/15";
  return "";
}

export default function SpeciesExplorer({ species }: { species: Species[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  const groups = useMemo(() => {
    const present = new Set(species.map((s) => s.group_name ?? ""));
    const ordered = GROUP_ORDER.filter((g) => present.has(g));
    const extras = [...present]
      .filter((g) => g && !GROUP_ORDER.includes(g))
      .sort();
    return [...ordered, ...extras];
  }, [species]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return species.filter((s) => {
      const matchesGroup = group === "All" || s.group_name === group;
      if (!matchesGroup) return false;
      if (q === "") return true;
      const haystack = [
        s.common_name,
        s.scientific_name ?? "",
        ...(s.also_known_as ?? []),
        ...(s.former_names ?? []),
        ...(s.trade_codes ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [species, query, group]);

  const grouped = useMemo(() => {
    const map = new Map<string, Species[]>();
    for (const s of filtered) {
      const key = s.group_name ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    for (const list of map.values())
      list.sort((a, b) => a.common_name.localeCompare(b.common_name));
    return map;
  }, [filtered]);

  const orderedKeys = useMemo(() => {
    const keys = [...grouped.keys()];
    return keys.sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a);
      const ib = GROUP_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [grouped]);

  function statLine(s: Species) {
    const parts: string[] = [];
    if (s.max_size_in != null) parts.push(`${s.max_size_in}"`);
    if (s.min_tank_gal != null) parts.push(`${s.min_tank_gal} gal`);
    if (s.temp_min_f != null && s.temp_max_f != null)
      parts.push(`${s.temp_min_f}–${s.temp_max_f}°F`);
    return parts.join("  ·  ");
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-6">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Species Database
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Freshwater Species
          </h1>
          <p className="text-ocean-300">
            {species.length} aquarium species and varieties with real care data.
            Search by name, scientific name, or trade code (try “L046”), or
            filter by group.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, scientific name, or code…"
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
            {group === "All" ? "Filter by group" : group}
          </span>
          <ChevronDown
            className={
              "w-4 h-4 transition-transform " + (showFilters ? "rotate-180" : "")
            }
          />
        </button>

        {/* Group chips — collapsible on mobile, always shown on desktop */}
        <div className={(showFilters ? "block" : "hidden") + " sm:block"}>
          <div className="flex flex-wrap gap-2 mb-5 pb-5 border-b border-white/10">
            {["All", ...groups].map((g) => {
              const active = group === g;
              return (
                <button
                  key={g}
                  onClick={() => {
                    setGroup(g);
                    setShowFilters(false);
                  }}
                  className={
                    "px-3 py-1 rounded-full text-sm border transition-colors " +
                    (active
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-ocean-300 hover:text-white hover:border-white/20")
                  }
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result count */}
        <p className="text-ocean-400 text-sm mb-6">
          {filtered.length === species.length
            ? `${species.length} species`
            : `${filtered.length} of ${species.length} species`}
        </p>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <p className="text-white font-medium mb-1">No species found</p>
            <p className="text-ocean-400 text-sm">
              Try a different search or clear your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {orderedKeys.map((key) => (
              <section key={key}>
                <h2 className="font-display text-2xl text-emerald-400 mb-4">
                  {key}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped.get(key)!.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/species/${s.slug}`}
                      className="block rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-white font-medium">
                          {s.common_name}
                        </h3>
                        <div className="flex flex-wrap justify-end gap-1 shrink-0">
                          {(s.trade_codes ?? []).map((c) => (
                            <span
                              key={c}
                              className="text-[11px] font-mono uppercase tracking-wide text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5"
                            >
                              {c}
                            </span>
                          ))}
                          {s.entry_type === "variety" && (
                            <span className="text-[11px] uppercase tracking-wide text-ocean-300 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                              variety
                            </span>
                          )}
                        </div>
                      </div>
                      {s.scientific_name && (
                        <p className="italic text-ocean-400 text-sm mt-0.5">
                          {s.scientific_name}
                        </p>
                      )}
                      {statLine(s) && (
                        <p className="text-ocean-300 text-sm mt-2 font-mono">
                          {statLine(s)}
                        </p>
                      )}
                      {s.suitability &&
                        s.suitability !== "Common" &&
                        s.suitability !== "Intermediate" && (
                          <span
                            className={
                              "inline-block mt-2 text-[11px] uppercase tracking-wide rounded-full border px-2 py-0.5 " +
                              suitabilityStyle(s.suitability)
                            }
                          >
                            {s.suitability}
                          </span>
                        )}
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