"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, MapPin, Store, BadgeCheck } from "lucide-react";

type StoreRow = {
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  tags: string[] | null;
  claimed_by: string | null;
};

export default function StoreDirectory({ stores }: { stores: StoreRow[] }) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) for (const t of s.tags ?? []) set.add(t);
    return [...set].sort();
  }, [stores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((s) => {
      if (activeType && !(s.tags ?? []).includes(activeType)) return false;
      if (!q) return true;
      const hay = [s.name, s.city ?? "", s.state ?? "", ...(s.tags ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [stores, query, activeType]);

  const byCity = useMemo(() => {
    const map = new Map<string, StoreRow[]>();
    for (const s of filtered) {
      const key = s.city || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [filtered]);

  const cities = [...byCity.keys()].sort();

  return (
    <div>
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by store, city, or type..."
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

        {allTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveType(null)}
              className={
                "rounded-lg border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors " +
                (activeType === null
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-white/5 border-white/10 text-ocean-300 hover:text-white")
              }
            >
              All
            </button>
            {allTypes.map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(activeType === t ? null : t)}
                className={
                  "rounded-lg border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors " +
                  (activeType === t
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-white/5 border-white/10 text-ocean-300 hover:text-white")
                }
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <p className="text-ocean-400 text-sm">
          {filtered.length} {filtered.length === 1 ? "store" : "stores"}
          {query || activeType ? " found" : ""}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
          <Store className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">No stores match your search</p>
          <p className="text-ocean-400 text-sm">
            Try a different name, city, or type.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {cities.map((city) => (
            <section key={city}>
              <h2 className="font-display text-2xl text-emerald-400 mb-4">{city}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byCity.get(city)!.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/stores/${s.slug}`}
                    className="block rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{s.name}</h3>
                      {s.claimed_by && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5 shrink-0">
                          <BadgeCheck className="w-3 h-3" /> Claimed
                        </span>
                      )}
                    </div>
                    {(s.city || s.state) && (
                      <p className="text-ocean-400 text-sm mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {[s.city, s.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {s.tags && s.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-[11px] uppercase tracking-wide text-ocean-300 bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}