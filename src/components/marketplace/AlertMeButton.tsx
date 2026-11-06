"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Check, Crosshair, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/marketplace/categories";
import { ALERT_RADII, milesBetween } from "@/lib/marketplace/match";

export type AlertPlace = { label: string; lat: number; lng: number };
type Region = { name: string; state_code: string; lat: number; lng: number };

// A page can show several Alert me buttons; only the first reopens after sign-in.
let autoOpened = false;

const INPUT =
  "w-full rounded-xl border border-ocean-700 bg-ocean-950 px-3 py-2.5 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500 focus:outline-none sm:text-sm";

/**
 * "Alert me when someone near me lists ___". Signing in is part of saving,
 * which is the point: an empty area becomes a reason to join instead of a
 * dead end. Locations are always a metro area, never someone's exact spot.
 */
export default function AlertMeButton({
  defaultQuery = "",
  defaultCategory = "all",
  place = null,
  label = "Alert me",
  className,
}: {
  defaultQuery?: string;
  defaultCategory?: string;
  place?: AlertPlace | null;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  // Back from signing in with ?alert=1: open straight away.
  useEffect(() => {
    if (!autoOpened && new URLSearchParams(window.location.search).get("alert") === "1") {
      autoOpened = true;
      setOpen(true);
    }
  }, []);

  async function start() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const url = new URL(window.location.href);
      url.searchParams.set("alert", "1");
      window.location.href = `/login?next=${encodeURIComponent(url.pathname + url.search)}`;
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={
          className ??
          "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
        }
      >
        <Bell className="h-4 w-4" /> {label}
      </button>
      {open && (
        <AlertForm
          defaultQuery={defaultQuery}
          defaultCategory={defaultCategory}
          place={place}
          onClose={() => {
            setOpen(false);
            // Drop ?alert=1 so a refresh doesn't reopen it.
            const url = new URL(window.location.href);
            if (url.searchParams.has("alert")) {
              url.searchParams.delete("alert");
              window.history.replaceState(null, "", url.pathname + url.search + url.hash);
            }
          }}
        />
      )}
    </>
  );
}

function AlertForm({
  defaultQuery,
  defaultCategory,
  place,
  onClose,
}: {
  defaultQuery: string;
  defaultCategory: string;
  place: AlertPlace | null;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [category, setCategory] = useState(defaultCategory || "all");
  const [where, setWhere] = useState<AlertPlace | null>(place);
  const [radius, setRadius] = useState<number>(50);
  const [wanted, setWanted] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The metro list, for picking or for snapping "my location" to the nearest one.
  useEffect(() => {
    createClient()
      .from("market_regions")
      .select("name, state_code, lat, lng")
      .not("lat", "is", null)
      .order("state_code")
      .order("name")
      .then(({ data }) => setRegions((data ?? []) as Region[]));
  }, []);

  const states = useMemo(() => [...new Set(regions.map((r) => r.state_code))], [regions]);
  const inState = useMemo(() => regions.filter((r) => r.state_code === state), [regions, state]);

  function useMyLocation() {
    if (!navigator.geolocation || regions.length === 0) {
      setError("Your browser can't share your location. Pick your area instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Only the nearest metro area is saved, never the exact spot.
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const near = [...regions].sort((a, b) => milesBetween(me, a) - milesBetween(me, b))[0];
        if (near) setWhere({ label: `${near.name}, ${near.state_code}`, lat: near.lat, lng: near.lng });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Pick your area instead.");
      },
      { timeout: 10_000, maximumAge: 600_000 }
    );
  }

  async function save() {
    setError(null);
    if (!where) return setError("Pick where to search.");
    if (!query.trim() && category === "all") return setError("Add a word or pick a category, so you don't get every ad.");
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          category,
          lat: where.lat,
          lng: where.lng,
          place_label: where.label,
          radius_miles: radius,
          include_wanted: wanted,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't save that. Try again.");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Get an alert" className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-ocean-800/60 bg-ocean-950 p-5 sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Bell className="h-5 w-5 text-emerald-300" /> Get an alert
            </h2>
            <p className="mt-1 text-sm text-ocean-200">We&apos;ll tell you the moment someone near you posts a match.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ocean-300 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {saved ? (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-100">
              <Check className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                Alert saved. You&apos;ll get a bell (and an email, unless you&apos;ve turned those off) when a match is posted within {radius}{" "}
                miles of {where?.label}.
              </span>
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/my/alerts" className="rounded-full border border-ocean-700 px-4 py-2 text-sm text-ocean-100 hover:border-emerald-500">
                See my alerts
              </Link>
              <button type="button" onClick={onClose} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean-100">What are you looking for?</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={80}
                placeholder="e.g. cherry shrimp, oscar, 75 gallon"
                className={INPUT}
              />
              <span className="mt-1 block text-xs text-ocean-300">Every word must be in the ad. Leave it empty to get everything in the category.</span>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean-100">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
                <option value="all">Any category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1 block text-sm font-medium text-ocean-100">Where</span>
              {where ? (
                <p className="flex items-center justify-between gap-3 rounded-xl border border-ocean-700 bg-ocean-900/60 px-3 py-2.5 text-white">
                  {where.label}
                  <button type="button" onClick={() => setWhere(null)} className="text-sm text-ocean-300 underline-offset-4 hover:text-white hover:underline">
                    Change
                  </button>
                </p>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-2 rounded-full border border-ocean-700 px-4 py-2 text-sm text-ocean-100 hover:border-emerald-500 disabled:opacity-60"
                  >
                    {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} Use my location
                  </button>
                  <div className="grid grid-cols-[6rem,1fr] gap-2">
                    <select value={state} onChange={(e) => setState(e.target.value)} className={INPUT} aria-label="State">
                      <option value="">State</option>
                      {states.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <select
                      value=""
                      disabled={!state}
                      onChange={(e) => {
                        const r = inState.find((x) => x.name === e.target.value);
                        if (r) setWhere({ label: `${r.name}, ${r.state_code}`, lat: r.lat, lng: r.lng });
                      }}
                      className={INPUT}
                      aria-label="Area"
                    >
                      <option value="">{state ? "Pick your area" : "Pick a state first"}</option>
                      {inState.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-ocean-300">Only your metro area is saved, never your exact location.</p>
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean-100">How far</span>
              <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className={INPUT}>
                {ALERT_RADII.map((r) => (
                  <option key={r} value={r}>
                    Within {r} miles
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-start gap-2 text-sm text-ocean-100">
              <input type="checkbox" checked={wanted} onChange={(e) => setWanted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-500" />
              Also tell me about Wanted posts (people looking to buy)
            </label>

            {error && <p className="text-sm text-coral-300">{error}</p>}

            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Save alert
            </button>
            <p className="text-center text-xs text-ocean-300">Free. Pause or remove it any time on My alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
