"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";

export type AwardSpecies = {
  id: string;
  program: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  points: number;
};

const CLASS_BY_POINTS: Record<number, string> = {
  5: "A",
  10: "B",
  15: "C",
  20: "D",
  25: "E",
  40: "F",
};

/**
 * Pick the fish you're going to try to breed.
 *
 * Search and a class filter, because the two questions a member actually has
 * are "is my fish on the list" and "what's worth the most". Everything is
 * filtered in the browser — the whole list is already on the page, so typing
 * costs nothing and works offline.
 */
export default function SpeciesBrowser({
  species,
  submitHref,
}: {
  species: AwardSpecies[];
  /** Where "Start a log" points, with ?species=<id> appended. */
  submitHref: string;
}) {
  const [query, setQuery] = useState("");
  const [klass, setKlass] = useState<number | null>(null);

  const classes = useMemo(
    () => Array.from(new Set(species.map((s) => s.points))).sort((a, b) => a - b),
    [species]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return species
      .filter((s) => (klass === null ? true : s.points === klass))
      .filter((s) =>
        q === ""
          ? true
          : s.common_name.toLowerCase().includes(q) ||
            (s.scientific_name ?? "").toLowerCase().includes(q) ||
            (s.category ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => a.common_name.localeCompare(b.common_name));
  }, [species, query, klass]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, species or group…"
            aria-label="Search species"
            /* text-base on mobile so iOS Safari doesn't zoom the page on focus. */
            className="w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 py-3 pl-10 pr-4 text-base text-white placeholder-ocean-600 transition-colors focus:border-amber-500/50 focus:outline-none sm:text-sm"
          />
        </div>

        <div className="-mx-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <button
            onClick={() => setKlass(null)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-sm transition-colors ${
              klass === null
                ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                : "border-ocean-800/60 text-ocean-300 hover:text-white"
            }`}
          >
            All
          </button>
          {classes.map((pts) => (
            <button
              key={pts}
              onClick={() => setKlass(pts === klass ? null : pts)}
              className={`shrink-0 rounded-xl border px-4 py-2 text-sm transition-colors ${
                klass === pts
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                  : "border-ocean-800/60 text-ocean-300 hover:text-white"
              }`}
            >
              {CLASS_BY_POINTS[pts] ? `Class ${CLASS_BY_POINTS[pts]}` : `${pts}`}
              <span className="ml-1.5 font-mono text-[10px] text-ocean-500">
                {pts}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ocean-600">
        {filtered.length} {filtered.length === 1 ? "species" : "species"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 p-8 text-center">
          <p className="text-sm text-ocean-400">
            Nothing matches that. If the fish you&apos;re breeding isn&apos;t on
            the list, submit it anyway and it gets classified before judging.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => {
            const letter = CLASS_BY_POINTS[s.points];
            return (
              <li key={s.id}>
                <Link
                  href={`${submitHref}?species=${s.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3 transition-colors hover:border-amber-500/40 hover:bg-amber-500/[0.05]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 font-display text-sm text-amber-300">
                    {letter ?? s.points}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {s.common_name}
                    </span>
                    {s.scientific_name && (
                      <span className="block truncate text-xs italic text-ocean-500">
                        {s.scientific_name}
                      </span>
                    )}
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block font-display text-lg text-amber-300">
                      {s.points}
                    </span>
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-ocean-600">
                      points
                    </span>
                  </span>

                  <ArrowRight className="h-4 w-4 shrink-0 text-ocean-700 transition-all group-hover:translate-x-1 group-hover:text-amber-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
