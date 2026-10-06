"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Fish, Leaf, ChevronRight } from "lucide-react";
import type { GuideCard } from "@/lib/breeding/guides";
import { CLASS_LADDER } from "@/lib/society/classes";

/**
 * Every guide, grouped by the Society's difficulty classes, with search,
 * a fish/plant switch and group chips. Grouping by class is the point:
 * it shows people where to start and what to aim for next.
 */
export default function GuideBrowser({ guides }: { guides: GuideCard[] }) {
  const [q, setQ] = useState("");
  const [program, setProgram] = useState<"bap" | "hap">("bap");
  const [group, setGroup] = useState<string>("All");

  const groups = useMemo(() => {
    const seen = new Map<string, number>();
    for (const g of guides) if (g.program === program && g.category) seen.set(g.category, (seen.get(g.category) ?? 0) + 1);
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [guides, program]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return guides.filter(
      (g) =>
        g.program === program &&
        (group === "All" || g.category === group) &&
        (!t ||
          g.name.toLowerCase().includes(t) ||
          (g.scientific ?? "").toLowerCase().includes(t) ||
          (g.category ?? "").toLowerCase().includes(t) ||
          (g.method ?? "").toLowerCase().includes(t))
    );
  }, [guides, q, program, group]);

  const byPoints = useMemo(() => {
    const m = new Map<number, GuideCard[]>();
    for (const g of shown) {
      const p = g.points ?? 0;
      m.set(p, [...(m.get(p) ?? []), g]);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [shown]);

  const blurb = (p: number) => CLASS_LADDER.find((c) => c.points === p);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["bap", "hap"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setProgram(p);
              setGroup("All");
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              program === p ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : "border-ocean-700/60 text-ocean-300 hover:text-white"
            }`}
          >
            {p === "bap" ? <Fish className="h-4 w-4" /> : <Leaf className="h-4 w-4" />}
            {p === "bap" ? "Fish & inverts" : "Plants"}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guides"
            aria-label="Search breeding guides"
            className="w-full rounded-xl border border-ocean-800/60 bg-ocean-950/60 py-2.5 pl-9 pr-3 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none sm:text-sm"
          />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-1.5">
        {[["All", shown.length] as [string, number], ...groups].map(([name, n]) => (
          <button
            key={name}
            type="button"
            onClick={() => setGroup(name)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              group === name ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : "border-white/10 text-ocean-300 hover:text-white"
            }`}
          >
            {name}
            {name !== "All" && <span className="ml-1 text-ocean-500">{n}</span>}
          </button>
        ))}
      </div>

      {byPoints.length === 0 ? (
        <p className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-8 text-center text-ocean-400">
          No guides match that. Try another name or group.
        </p>
      ) : (
        <div className="space-y-10">
          {byPoints.map(([points, list]) => {
            const c = blurb(points);
            return (
              <section key={points} id={c ? `class-${c.letter.toLowerCase()}` : `points-${points}`} className="scroll-mt-28">
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-display text-2xl text-white">
                    {c ? `Class ${c.letter}` : `${points} points`}
                    <span className="ml-2 text-base text-amber-300">{points} points</span>
                  </h2>
                  {c && <p className="text-sm text-ocean-400">{c.blurb}</p>}
                </div>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={`/breeding/${g.slug}`}
                        className="flex h-full items-start justify-between gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 transition-colors hover:border-emerald-500/40 hover:bg-ocean-900/70"
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-white">{g.name}</span>
                          {g.scientific && <span className="block truncate text-xs italic text-ocean-400">{g.scientific}</span>}
                          <span className="mt-1 block truncate text-xs text-ocean-500">
                            {[g.method, g.category].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ocean-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
