"use client";

import { useMemo, useState } from "react";
import {
  Search,
  X,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Info,
  Fish,
} from "lucide-react";
import {
  buildTank,
  type Species,
  type StockItem,
  type Issue,
} from "@/lib/tankBuilder/engine";

export default function TankBuilder({ species }: { species: Species[] }) {
  const [gallonsInput, setGallonsInput] = useState("");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [query, setQuery] = useState("");

  const gallons = parseFloat(gallonsInput) || 0;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(stock.map((s) => s.species.slug));
    return species
      .filter(
        (s) =>
          !chosen.has(s.slug) &&
          (s.common_name.toLowerCase().includes(q) ||
            (s.scientific_name ?? "").toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [query, species, stock]);

  const result = useMemo(() => buildTank(gallons, stock), [gallons, stock]);

  function addSpecies(s: Species) {
    setStock((prev) => [...prev, { species: s, qty: 1 }]);
    setQuery("");
  }
  function setQty(slug: string, qty: number) {
    setStock((prev) =>
      prev.map((it) =>
        it.species.slug === slug ? { ...it, qty: Math.max(1, qty) } : it
      )
    );
  }
  function remove(slug: string) {
    setStock((prev) => prev.filter((it) => it.species.slug !== slug));
  }

  const conflicts = result.issues.filter((i) => i.level === "conflict");
  const cautions = result.issues.filter((i) => i.level === "caution");
  const hasStock = stock.length > 0;

  let banner = { text: "", className: "", Icon: CheckCircle2 };
  if (hasStock && conflicts.length > 0) {
    banner = {
      text: `${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""} to resolve`,
      className: "bg-red-500/10 border-red-500/30 text-red-300",
      Icon: AlertTriangle,
    };
  } else if (hasStock && cautions.length > 0) {
    banner = {
      text: `Workable — ${cautions.length} thing${cautions.length > 1 ? "s" : ""} to check`,
      className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      Icon: Info,
    };
  } else if (hasStock) {
    banner = {
      text: "Looks compatible",
      className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      Icon: CheckCircle2,
    };
  }

  const stockingColor =
    result.stocking.level === "over"
      ? "bg-red-500"
      : result.stocking.level === "near"
      ? "bg-amber-500"
      : "bg-emerald-500";

  function issueStyle(level: Issue["level"]) {
    if (level === "conflict")
      return { box: "border-red-500/30 bg-red-500/5", icon: "text-red-400", I: AlertTriangle };
    if (level === "caution")
      return { box: "border-amber-500/30 bg-amber-500/5", icon: "text-amber-400", I: AlertTriangle };
    return { box: "border-white/10 bg-white/5", icon: "text-ocean-400", I: Info };
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-8">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Tank Builder
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Plan a compatible tank
          </h1>
          <p className="text-ocean-300">
            Set your tank size, add the fish you have in mind, and get live
            compatibility, stocking, and equipment guidance — with the reasoning
            behind every flag.
          </p>
        </div>

        {/* Tank size */}
        <label className="block text-sm text-ocean-300 mb-2">Tank size</label>
        <div className="relative mb-8 max-w-xs">
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={gallonsInput}
            onChange={(e) => setGallonsInput(e.target.value)}
            placeholder="e.g. 29"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 pr-16 text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40 focus:bg-white/10 transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ocean-400 text-sm">
            gallons
          </span>
        </div>

        {/* Add fish */}
        <label className="block text-sm text-ocean-300 mb-2">Add fish</label>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search species to add…"
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
          {matches.length > 0 && (
            <div className="absolute z-10 mt-2 w-full rounded-xl bg-ocean-950 border border-white/10 shadow-xl overflow-hidden">
              {matches.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => addSpecies(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between gap-3"
                >
                  <span className="text-white text-sm">{s.common_name}</span>
                  <span className="text-ocean-500 text-xs italic truncate">
                    {s.scientific_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected fish */}
        {hasStock ? (
          <div className="space-y-2 mb-8">
            {stock.map(({ species: s, qty }) => (
              <div
                key={s.slug}
                className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">
                    {s.common_name}
                  </p>
                  <p className="text-ocean-400 text-xs">
                    {s.max_size_in != null ? `${s.max_size_in}"` : "—"}
                    {s.min_tank_gal != null ? ` · ${s.min_tank_gal} gal min` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setQty(s.slug, qty - 1)}
                    aria-label="Decrease"
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-ocean-200 hover:text-white flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center text-white text-sm">{qty}</span>
                  <button
                    onClick={() => setQty(s.slug, qty + 1)}
                    aria-label="Increase"
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-ocean-200 hover:text-white flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => remove(s.slug)}
                    aria-label="Remove"
                    className="w-7 h-7 rounded-lg text-ocean-400 hover:text-white hover:bg-white/10 flex items-center justify-center ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center mb-8">
            <Fish className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Start adding fish</p>
            <p className="text-ocean-400 text-sm">
              Search above to drop your first species in and the checks begin.
            </p>
          </div>
        )}

        {/* Results */}
        {hasStock && (
          <div className="space-y-6">
            {/* Banner */}
            <div
              className={
                "flex items-center gap-2 rounded-xl border px-4 py-3 " + banner.className
              }
            >
              <banner.Icon className="w-5 h-5 shrink-0" />
              <span className="font-medium">{banner.text}</span>
            </div>

            {/* Stocking */}
            {gallons > 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400">
                    Stocking
                  </h2>
                  <span className="text-white text-sm">
                    {result.stocking.pct}% · {result.stocking.label}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden mb-3">
                  <div
                    className={"h-full rounded-full " + stockingColor}
                    style={{ width: `${Math.min(result.stocking.pct, 100)}%` }}
                  />
                </div>
                <p className="text-ocean-400 text-xs leading-relaxed">
                  {result.stocking.reasoning}
                </p>
              </div>
            )}

            {/* Equipment */}
            {gallons > 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
                  Equipment for {gallons} gallons
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
                    <dt className="text-[11px] uppercase tracking-wide text-ocean-400 mb-0.5">
                      Heater
                    </dt>
                    <dd className="text-white text-sm">
                      {result.equipment.heaterWattsLow}–
                      {result.equipment.heaterWattsHigh} W
                    </dd>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
                    <dt className="text-[11px] uppercase tracking-wide text-ocean-400 mb-0.5">
                      Filter flow
                    </dt>
                    <dd className="text-white text-sm">
                      {result.equipment.filterGphLow}–
                      {result.equipment.filterGphHigh} GPH
                    </dd>
                  </div>
                </div>
                {result.equipment.heaterNote && (
                  <p className="text-ocean-400 text-xs mt-3">
                    {result.equipment.heaterNote}
                  </p>
                )}
              </div>
            )}

            {/* Issues */}
            {result.issues.length > 0 ? (
              <div className="space-y-2">
                {result.issues.map((issue, i) => {
                  const st = issueStyle(issue.level);
                  return (
                    <div
                      key={i}
                      className={"rounded-xl border p-4 flex gap-3 " + st.box}
                    >
                      <st.I className={"w-5 h-5 shrink-0 mt-0.5 " + st.icon} />
                      <div>
                        <p className="text-white text-sm font-medium">
                          {issue.title}
                        </p>
                        <p className="text-ocean-300 text-sm mt-0.5 leading-relaxed">
                          {issue.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                <p className="text-ocean-200 text-sm">
                  No conflicts found for this combination. Always double-check
                  individual temperaments — every fish has its own personality.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}