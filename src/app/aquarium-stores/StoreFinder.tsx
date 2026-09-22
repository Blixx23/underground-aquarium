"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Crosshair, Loader2, MapPin, Store } from "lucide-react";

export type FinderCity = { label: string; href: string; count: number; lat: number | null; lng: number | null };
export type FinderShop = { label: string; sub: string; href: string };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();

function miles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * One box, like a search engine: type a city or a shop and pick it, or
 * tap "Use my location" to jump to the nearest city with shops.
 */
export default function StoreFinder({ cities, shops }: { cities: FinderCity[]; shops: FinderShop[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cityIndex = useMemo(() => cities.map((c) => ({ c, k: norm(c.label) })), [cities]);
  const shopIndex = useMemo(() => shops.map((s) => ({ s, k: norm(`${s.label} ${s.sub}`) })), [shops]);

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return [] as { kind: "city" | "shop"; label: string; sub: string; href: string }[];
    const words = n.split(" ");
    const hit = (k: string) => words.every((w) => k.includes(w));
    const starts = (k: string) => k.startsWith(n);
    const cs = cityIndex
      .filter((x) => hit(x.k))
      .sort((a, b) => Number(starts(b.k)) - Number(starts(a.k)) || b.c.count - a.c.count)
      .slice(0, 5)
      .map((x) => ({
        kind: "city" as const,
        label: x.c.label,
        sub: `${x.c.count} ${x.c.count === 1 ? "shop" : "shops"}`,
        href: x.c.href,
      }));
    const ss = shopIndex
      .filter((x) => hit(x.k))
      .sort((a, b) => Number(starts(b.k)) - Number(starts(a.k)))
      .slice(0, 5)
      .map((x) => ({ kind: "shop" as const, label: x.s.label, sub: x.s.sub, href: x.s.href }));
    return [...cs, ...ss];
  }, [q, cityIndex, shopIndex]);

  function go(i = active) {
    const r = results[i];
    if (r) router.push(r.href);
    else if (q.trim()) router.push(`/stores?q=${encodeURIComponent(q.trim())}`);
  }

  function locate() {
    setErr(null);
    if (!("geolocation" in navigator)) {
      setErr("Your browser can't share location. Type your city instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let best: FinderCity | null = null;
        let bestD = Infinity;
        for (const c of cities) {
          if (c.lat == null || c.lng == null) continue;
          const d = miles(latitude, longitude, c.lat, c.lng);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        if (best) router.push(best.href);
        else {
          setLocating(false);
          setErr("Couldn't find a city near you. Type it instead.");
        }
      },
      () => {
        setLocating(false);
        setErr("Location is blocked. Type your city instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="relative"
      >
        <div
          className={`flex items-center gap-3 border border-ocean-600/60 bg-ocean-950/80 px-5 shadow-2xl shadow-black/40 transition-colors focus-within:border-ocean-400 ${
            open && results.length ? "rounded-t-[28px] border-b-transparent" : "rounded-full"
          }`}
        >
          <Search className="h-5 w-5 shrink-0 text-ocean-400" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
            }}
            placeholder="City, state or shop name"
            aria-label="Search for a fish store"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-white placeholder-ocean-500 outline-none sm:h-16 sm:text-lg"
          />
          {q && (
            <button
              type="submit"
              className="shrink-0 rounded-full bg-ocean-500 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-400"
            >
              Search
            </button>
          )}
        </div>

        {open && results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 overflow-hidden rounded-b-[28px] border border-t-0 border-ocean-400 bg-ocean-950 pb-2 shadow-2xl shadow-black/50">
            <li className="mx-5 mb-1 border-t border-ocean-800" aria-hidden="true" />
            {results.map((r, i) => (
              <li key={r.href}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(i)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 px-5 py-2.5 text-left ${
                    i === active ? "bg-ocean-800/60" : ""
                  }`}
                >
                  {r.kind === "city" ? (
                    <MapPin className="h-4 w-4 shrink-0 text-ocean-400" />
                  ) : (
                    <Store className="h-4 w-4 shrink-0 text-ocean-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-white">{r.label}</span>
                  <span className="shrink-0 text-xs text-ocean-500">{r.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="inline-flex h-12 items-center gap-2 rounded-full border border-ocean-700/70 bg-ocean-900/60 px-6 text-sm font-medium text-ocean-100 transition-colors hover:border-ocean-500 hover:text-white disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          {locating ? "Finding shops near you…" : "Use my location"}
        </button>
        {err && <p className="text-sm text-amber-200">{err}</p>}
      </div>
    </div>
  );
}
