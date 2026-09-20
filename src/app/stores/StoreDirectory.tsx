"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  X,
  MapPin,
  Store,
  BadgeCheck,
  Navigation,
  LocateFixed,
  ChevronLeft,
} from "lucide-react";
import Stars from "@/components/stores/Stars";
import {
  queryWords,
  tokenise,
  score,
  highlight,
  type Token,
} from "@/lib/stores/search";

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  tags: string[] | null;
  claimed_by: string | null;
  lat: number | null;
  lng: number | null;
  rating_avg: number | null;
  rating_count: number;
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington DC",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const stateName = (code: string) => STATE_NAMES[code] ?? code;

/** How many cards to show before asking for more. */
const PAGE = 48;

function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StoreDirectory({
  stores,
  autoLocate = false,
}: {
  stores: StoreRow[];
  autoLocate?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const asked = useRef(false);
  useEffect(() => {
    if (autoLocate && !asked.current) {
      asked.current = true;
      findMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

  // Any change of filter starts the list over from the top.
  useEffect(() => setLimit(PAGE), [query, stateCode, activeType, coords]);

  function findMe() {
    if (locating) return;
    if (!("geolocation" in navigator)) {
      setLocError("Your browser doesn't support location.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStateCode(null);
        setLocating(false);
      },
      () => {
        setLocError("Couldn't get your location. Check your browser permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  /** Shops per state, for the browse grid. */
  const stateCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stores) {
      const k = s.state || "??";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .filter(([k]) => k !== "??")
      .sort((a, b) => stateName(a[0]).localeCompare(stateName(b[0])));
  }, [stores]);

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) for (const t of s.tags ?? []) set.add(t);
    return [...set].sort();
  }, [stores]);

  const words = useMemo(() => queryWords(query), [query]);
  const searching = words.length > 0;

  // Each shop broken into searchable words once, not on every keystroke.
  const tokens = useMemo(() => {
    const m = new Map<string, Token[]>();
    for (const s of stores) {
      m.set(s.slug, [
        ...tokenise(s.name, "name"),
        ...tokenise(
          [s.city ?? "", s.state ?? "", stateName(s.state ?? ""), ...(s.tags ?? [])].join(" "),
          "place"
        ),
      ]);
    }
    return m;
  }, [stores]);

  /**
   * Exact matches first. Only when there are none do we forgive typos, so a
   * search spelled right is never padded with near misses.
   */
  const { filtered, closeMatches } = useMemo(() => {
    const pool = stores.filter((s) => {
      if (activeType && !(s.tags ?? []).includes(activeType)) return false;
      // A chosen state doesn't cage a search: searching looks everywhere.
      if (stateCode && !searching && s.state !== stateCode) return false;
      return true;
    });
    if (!searching) return { filtered: pool, closeMatches: false };

    const run = (allowClose: boolean) =>
      pool
        .map((s) => ({ s, sc: score(words, tokens.get(s.slug) ?? [], allowClose) }))
        .filter((x): x is { s: StoreRow; sc: number } => x.sc != null)
        .sort((a, b) => a.sc - b.sc || a.s.name.localeCompare(b.s.name))
        .map((x) => x.s);

    const exact = run(false);
    if (exact.length) return { filtered: exact, closeMatches: false };
    return { filtered: run(true), closeMatches: true };
  }, [stores, words, tokens, searching, stateCode, activeType]);

  const ranked = useMemo(() => {
    if (!coords) return null;
    return filtered
      .map((s) => ({
        store: s,
        miles:
          s.lat != null && s.lng != null
            ? milesBetween(coords.lat, coords.lng, s.lat, s.lng)
            : null,
      }))
      .sort((a, b) => {
        if (a.miles == null) return 1;
        if (b.miles == null) return -1;
        return a.miles - b.miles;
      });
  }, [filtered, coords]);

  /** Cities inside the chosen state, so headings never merge two states. */
  const byCity = useMemo(() => {
    if (!stateCode || searching || coords) return null;
    const m = new Map<string, StoreRow[]>();
    for (const s of filtered) {
      const key = s.city || "Elsewhere in the state";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(s);
    }
    return [...m.entries()].sort((a, b) => {
      if (a[0].startsWith("Elsewhere")) return 1;
      if (b[0].startsWith("Elsewhere")) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered, stateCode, searching, coords]);

  const showBrowse = !stateCode && !searching && !coords;
  const hasFilters = searching || stateCode !== null || activeType !== null || coords !== null;

  function clearAll() {
    setQuery("");
    setStateCode(null);
    setActiveType(null);
    setCoords(null);
  }

  /** Shows which letters the search matched, so a result never looks random. */
  function lit(text: string) {
    if (!searching) return text;
    return highlight(text, words, closeMatches).map((seg, i) =>
      seg.hit ? (
        <mark key={i} className="rounded-sm bg-emerald-400/20 px-px text-emerald-200">
          {seg.text}
        </mark>
      ) : (
        <span key={i}>{seg.text}</span>
      )
    );
  }

  function card(s: StoreRow, miles: number | null, showState: boolean) {
    const place = [s.city, showState ? s.state : null].filter(Boolean).join(", ");
    return (
      <Link
        key={s.slug}
        href={`/stores/${s.slug}`}
        className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-emerald-500/40 hover:bg-white/10"
      >
        <div className="flex items-start gap-2">
          <h3 className="font-medium leading-snug text-white">{lit(s.name)}</h3>
          {s.claimed_by && (
            <BadgeCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
              aria-label="Claimed by the owner"
            />
          )}
        </div>
        <Stars
          rating={s.rating_avg}
          count={s.rating_count}
          size={13}
          className="mt-1.5"
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {place && (
            <span className="flex items-center gap-1 text-ocean-400">
              <MapPin className="h-3.5 w-3.5" />
              {lit(place)}
            </span>
          )}
          {miles != null && (
            <span className="flex items-center gap-1 font-medium text-emerald-300">
              <Navigation className="h-3 w-3" />
              {miles < 0.1 ? "under 0.1" : miles.toFixed(1)} mi
            </span>
          )}
        </div>
        {s.tags && s.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {s.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-ocean-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </Link>
    );
  }

  return (
    <div>
      {/* Search and location stay in reach while the list scrolls. */}
      <div className="sticky top-16 z-20 -mx-6 mb-6 border-b border-white/10 bg-ocean-950/90 px-6 pb-4 pt-4 backdrop-blur-md">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-400" />
            <input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by shop, city or state…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-11 text-white transition-colors placeholder:text-ocean-400 focus:border-emerald-500/40 focus:bg-white/10 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ocean-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={coords ? () => setCoords(null) : findMe}
            disabled={locating}
            className={
              "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 " +
              (coords
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20")
            }
          >
            <LocateFixed className="h-4 w-4" />
            {locating ? "Locating…" : coords ? "Nearest first · clear" : "Near me"}
          </button>
        </div>
        {locError && <p className="mt-2 text-xs text-coral-300">{locError}</p>}
      </div>

      {/* Specialty filters, only once there's a list worth narrowing. */}
      {!showBrowse && allTypes.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(activeType === t ? null : t)}
              className={
                "rounded-lg border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors " +
                (activeType === t
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-white/10 bg-white/5 text-ocean-300 hover:text-white")
              }
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Where you are, and the way back out. */}
      {!showBrowse && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {stateCode && !searching && !coords && (
              <button
                onClick={() => setStateCode(null)}
                className="inline-flex items-center gap-1 text-sm text-ocean-300 transition-colors hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" /> All states
              </button>
            )}
            <p className="text-sm text-ocean-400">
              {searching && closeMatches && filtered.length > 0 && (
                <span className="text-amber-300">No exact match. </span>
              )}
              <span className="font-semibold text-white">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "shop" : "shops"}
              {stateCode && !searching && !coords ? ` in ${stateName(stateCode)}` : ""}
              {searching && !closeMatches ? " match your search" : ""}
              {searching && closeMatches ? " with a close spelling" : ""}
              {coords ? ", nearest first" : ""}
            </p>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-sm text-ocean-400 underline underline-offset-2 transition-colors hover:text-white"
            >
              Start over
            </button>
          )}
        </div>
      )}

      {/* Landing view: pick a state instead of scrolling 317 cards. */}
      {showBrowse ? (
        <div>
          <h2 className="mb-1 font-display text-xl text-white">Browse by state</h2>
          <p className="mb-4 text-sm text-ocean-400">
            {stores.length} shops in {stateCounts.length} states. Use Near me above to
            sort by distance instead.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {stateCounts.map(([code, count]) => (
              <button
                key={code}
                onClick={() => setStateCode(code)}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-left transition-colors hover:border-emerald-500/40 hover:bg-white/10"
              >
                <span className="truncate text-sm font-medium text-white">
                  {stateName(code)}
                </span>
                <span className="ml-2 shrink-0 text-xs font-semibold text-ocean-400">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <Store className="mx-auto mb-3 h-8 w-8 text-ocean-600" />
          <p className="mb-1 font-medium text-white">Nothing matched</p>
          <p className="text-sm text-ocean-400">
            Try a shop name, a city, or a state.
          </p>
          <button
            onClick={clearAll}
            className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
          >
            Clear filters
          </button>
        </div>
      ) : ranked ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.slice(0, limit).map(({ store, miles }) => card(store, miles, true))}
          </div>
          {ranked.length > limit && (
            <ShowMore
              remaining={ranked.length - limit}
              onClick={() => setLimit((n) => n + PAGE)}
            />
          )}
        </>
      ) : byCity ? (
        <div className="space-y-8">
          {byCity.map(([city, list]) => (
            <section key={city}>
              <h2 className="mb-3 font-display text-lg text-emerald-400">
                {city}
                <span className="ml-2 text-sm font-normal text-ocean-500">
                  {list.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => card(s, null, false))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, limit).map((s) => card(s, null, true))}
          </div>
          {filtered.length > limit && (
            <ShowMore
              remaining={filtered.length - limit}
              onClick={() => setLimit((n) => n + PAGE)}
            />
          )}
        </>
      )}
    </div>
  );
}

function ShowMore({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <div className="mt-6 text-center">
      <button
        onClick={onClick}
        className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-emerald-500/40 hover:bg-white/10"
      >
        Show {Math.min(remaining, PAGE)} more
        <span className="ml-1.5 text-ocean-400">({remaining} left)</span>
      </button>
    </div>
  );
}
