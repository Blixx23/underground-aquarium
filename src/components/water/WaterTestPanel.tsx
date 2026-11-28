"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { joinHref, loginHref, trackJoinClick } from "@/lib/analytics/join";
import {
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Info,
  Thermometer,
  FlaskConical,
  Gauge,
  Save,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import WaterPlanCard from "@/components/water/WaterPlanCard";
import TestKitPick from "@/components/water/TestKitPick";
import { WaterTrends } from "@/components/tank-builder/Insights";
import type { StockItem } from "@/lib/tankBuilder/engine";
import {
  checkWater,
  checkFishlessCycle,
  waterPlans,
  type WaterReading,
  type WaterLevel,
} from "@/lib/waterCheck/engine";
import { fToC, fToC1, readingF } from "@/lib/units";
import { WATER, CARE } from "@/lib/data/facts";

/**
 * The one water test used everywhere: the Water Check page and the Tank
 * Builder's Water tab. Same form, same read-out, same logging and history,
 * so an improvement here shows up in both tools at once.
 *
 * The typed numbers and the fishless switch are owned by the page (passed in),
 * so they survive the Tank Builder switching tabs. Everything else (results,
 * logging, history) lives here.
 */

export type WaterFieldKey = "temp_f" | "ph" | "ammonia_ppm" | "nitrite_ppm" | "nitrate_ppm" | "gh" | "kh";
export type WaterInputs = Record<WaterFieldKey, string>;

export const EMPTY_WATER: WaterInputs = {
  temp_f: "",
  ph: "",
  ammonia_ppm: "",
  nitrite_ppm: "",
  nitrate_ppm: "",
  gh: "",
  kh: "",
};

type Field = {
  key: WaterFieldKey;
  parameter: string; // matches WaterFinding.parameter from the engine
  label: string;
  unit: string;
  placeholder: string;
  step: string;
  hint: string;
};

const GROUPS: { title: string; blurb: string; Icon: typeof Thermometer; fields: Field[] }[] = [
  {
    title: "Temperature & pH",
    blurb: "The basics: comfort and acidity.",
    Icon: Thermometer,
    fields: [
      {
        key: "temp_f",
        parameter: "Temperature",
        label: "Temperature",
        unit: "°F",
        placeholder: "78",
        step: "1",
        hint: `Safe ${WATER.tempLow}-${WATER.tempHigh}°F (${fToC(WATER.tempLow)}-${fToC(WATER.tempHigh)}°C) · most like ${CARE.tropicalTemp[0]}-${CARE.tropicalTemp[1]}°F (${fToC(CARE.tropicalTemp[0])}-${fToC(CARE.tropicalTemp[1])}°C)`,
      },
      { key: "ph", parameter: "pH", label: "pH", unit: "", placeholder: "7.2", step: "0.1", hint: `Safe ${WATER.phLow.toFixed(1)}-${WATER.phHigh.toFixed(1)} · ideal varies by fish` },
    ],
  },
  {
    title: "The nitrogen cycle",
    blurb: "Fish waste turns to ammonia, then nitrite, then nitrate. This is where most trouble shows up.",
    Icon: FlaskConical,
    fields: [
      { key: "ammonia_ppm", parameter: "Ammonia", label: "Ammonia", unit: "ppm", placeholder: "0", step: "0.25", hint: "Should be 0" },
      { key: "nitrite_ppm", parameter: "Nitrite", label: "Nitrite", unit: "ppm", placeholder: "0", step: "0.25", hint: "Should be 0" },
      { key: "nitrate_ppm", parameter: "Nitrate", label: "Nitrate", unit: "ppm", placeholder: "10", step: "5", hint: `Keep under ${WATER.nitrateOk}` },
    ],
  },
  {
    title: "Hardness",
    blurb: "How mineral-rich your water is, and how stable your pH stays.",
    Icon: Gauge,
    fields: [
      { key: "gh", parameter: "GH", label: "GH", unit: "dGH", placeholder: "8", step: "1", hint: `Very soft under ${WATER.ghSoft}, very hard over ${WATER.ghHard} · ppm works too` },
      { key: "kh", parameter: "KH", label: "KH", unit: "dKH", placeholder: "5", step: "1", hint: `${WATER.khLow}+ keeps pH steady · ppm works too` },
    ],
  },
];

// Each result links to the glossary entry that explains it in full.
const GLOSSARY_FOR: Record<string, { slug: string; label: string }> = {
  Ammonia: { slug: "ammonia", label: "ammonia" },
  Nitrite: { slug: "nitrite", label: "nitrite" },
  Nitrate: { slug: "nitrate", label: "nitrate" },
  pH: { slug: "ph", label: "pH" },
  "pH vs. your fish": { slug: "ph", label: "pH" },
  GH: { slug: "gh", label: "GH" },
  "GH vs. your fish": { slug: "gh", label: "GH" },
  KH: { slug: "kh", label: "KH" },
};

type WaterLog = {
  id: string;
  measured_at: string;
  temp_f: number | null;
  ph: number | null;
  ammonia_ppm: number | null;
  nitrite_ppm: number | null;
  nitrate_ppm: number | null;
  gh: number | null;
  kh: number | null;
  note: string | null;
};

function toC(f: string): string | null {
  const n = parseFloat(f);
  return Number.isFinite(n) && f.trim() !== "" ? String(fToC1(n)) : null;
}

function ringFor(level: WaterLevel | undefined, filled: boolean) {
  if (!filled) return "border-white/10 focus:border-emerald-500/40";
  if (level === "danger") return "border-red-500/50 focus:border-red-500";
  if (level === "warning") return "border-amber-500/50 focus:border-amber-500";
  if (level === "note") return "border-sky-500/50 focus:border-sky-500";
  if (level === "ok") return "border-emerald-500/50 focus:border-emerald-500";
  return "border-white/10 focus:border-emerald-500/40";
}

function dotFor(level: WaterLevel | undefined) {
  if (level === "danger") return "bg-red-400";
  if (level === "warning") return "bg-amber-400";
  if (level === "note") return "bg-sky-400";
  if (level === "ok") return "bg-emerald-400";
  return "bg-ocean-600";
}

function findingStyle(level: WaterLevel) {
  if (level === "danger") return { box: "border-red-500/30 bg-red-500/5", icon: "text-red-400", I: AlertTriangle };
  if (level === "warning") return { box: "border-amber-500/30 bg-amber-500/5", icon: "text-amber-400", I: AlertTriangle };
  if (level === "note") return { box: "border-sky-500/30 bg-sky-500/5", icon: "text-sky-400", I: Info };
  if (level === "ok") return { box: "border-emerald-500/30 bg-emerald-500/5", icon: "text-emerald-400", I: CheckCircle2 };
  return { box: "border-white/10 bg-white/5", icon: "text-ocean-400", I: Info };
}

// "Jun 16, 2026 · 3:40 PM"
function fmtReadingDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function readingSummary(r: WaterLog): string {
  const parts: string[] = [];
  if (r.temp_f != null) parts.push(`Temp ${readingF(r.temp_f)}`);
  if (r.ph != null) parts.push(`pH ${r.ph}`);
  if (r.ammonia_ppm != null) parts.push(`Ammonia ${r.ammonia_ppm} ppm`);
  if (r.nitrite_ppm != null) parts.push(`Nitrite ${r.nitrite_ppm} ppm`);
  if (r.nitrate_ppm != null) parts.push(`Nitrate ${r.nitrate_ppm} ppm`);
  if (r.gh != null) parts.push(`GH ${r.gh} dGH`);
  if (r.kh != null) parts.push(`KH ${r.kh} dKH`);
  return parts.length ? parts.join(" · ") : "No values recorded";
}

function ping(source: string) {
  fetch("/api/bubbles/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  }).catch(() => {});
}

export default function WaterTestPanel({
  water,
  onWaterChange,
  fishless,
  onFishlessChange,
  stock,
  layout,
  userId,
  tankId,
  tankName,
  ensureTank,
  ensureBusy = false,
  signInNext,
  beforeLog,
  noStockHint,
  idPrefix,
  verdictBar = false,
}: {
  water: WaterInputs;
  onWaterChange: (next: WaterInputs) => void;
  fishless: boolean;
  onFishlessChange: (next: boolean) => void;
  /** The fish to check the water against (empty = general checks only). */
  stock: StockItem[];
  /** "split": form beside results on wide screens (Water Check). "stack": one column (Tank Builder). */
  layout: "split" | "stack";
  /** Signed-in member, or null. */
  userId: string | null;
  /** The tank readings log to and load history from. */
  tankId: string | null;
  tankName?: string;
  /** Tank Builder: saves the build when there's no tank yet and returns its id. */
  ensureTank?: () => Promise<string | null>;
  ensureBusy?: boolean;
  /** When set, signed-out visitors get a sign-in prompt that returns here. */
  signInNext?: string;
  /** Rendered above the log card (Water Check's tank picker). */
  beforeLog?: ReactNode;
  /** Shown under the form when there are no fish to compare with. */
  noStockHint?: string;
  /** Keeps element ids unique per page. */
  idPrefix: string;
  /** Phones: a slim verdict bar that follows the reader until the results are on screen. */
  verdictBar?: boolean;
}) {
  const [supabase] = useState(() => createClient());

  // ---- The reading ----
  const reading: WaterReading = useMemo(() => {
    const num = (s: string): number | null => {
      const t = s.trim();
      if (t === "") return null;
      const n = parseFloat(t);
      return Number.isNaN(n) ? null : n;
    };
    return {
      temp_f: num(water.temp_f),
      ph: num(water.ph),
      ammonia_ppm: num(water.ammonia_ppm),
      nitrite_ppm: num(water.nitrite_ppm),
      nitrate_ppm: num(water.nitrate_ppm),
      gh: num(water.gh),
      kh: num(water.kh),
    };
  }, [water]);

  const fishlessCheck = useMemo(() => checkFishlessCycle(reading), [reading]);
  const normalResult = useMemo(() => checkWater(reading, stock), [reading, stock]);
  const waterResult = fishless ? fishlessCheck.result : normalResult;
  // Readings that share a cause get one explanation and one set of steps.
  const normalPlans = useMemo(() => waterPlans(reading, stock), [reading, stock]);
  const plans = fishless ? (fishlessCheck.plan ? [fishlessCheck.plan] : []) : normalPlans;
  const covered = new Set(plans.flatMap((p) => p.covers));

  const levelByParam = useMemo(() => {
    const m: Record<string, WaterLevel> = {};
    for (const f of waterResult.findings) m[f.parameter] = f.level;
    return m;
  }, [waterResult]);

  function setField(key: WaterFieldKey, value: string) {
    onWaterChange({ ...water, [key]: value });
  }

  const order: Record<WaterLevel, number> = { danger: 0, warning: 1, note: 2, ok: 3 };
  const detailed = waterResult.findings.filter((f) => f.level !== "ok").sort((a, b) => order[a.level] - order[b.level]);
  const healthy = waterResult.findings.filter((f) => f.level === "ok");
  const dangerCount = waterResult.findings.filter((f) => f.level === "danger").length;
  const warnCount = waterResult.findings.filter((f) => f.level === "warning").length;
  const noteCount = waterResult.findings.filter((f) => f.level === "note").length;
  const okCount = healthy.length;

  let banner: { text: string; sub: string; className: string; Icon: typeof CheckCircle2 } | null = null;
  if (waterResult.status === "danger") {
    banner = {
      text: "Needs attention now",
      sub: "Something in your water is stressing your fish. See the steps below.",
      className: "bg-red-500/10 border-red-500/30 text-red-300",
      Icon: AlertTriangle,
    };
  } else if (waterResult.status === "warning") {
    banner = {
      text: "A few things to watch",
      sub: "Not an emergency, but worth acting on soon.",
      className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      Icon: Info,
    };
  } else if (waterResult.status === "ok") {
    banner =
      noteCount > 0
        ? {
            text: "Looking good, with a couple of notes",
            sub: "Nothing's wrong. A few values sit at the edge of the ideal range. Details below.",
            className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
            Icon: CheckCircle2,
          }
        : {
            text: "Your water looks healthy",
            sub: "Everything you entered is in a good range. Keep it up.",
            className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
            Icon: CheckCircle2,
          };
  }
  if (fishless && banner) {
    banner =
      waterResult.status === "warning"
        ? {
            text: "Something is slowing your cycle",
            sub: "With no fish in the tank nothing is at risk, but fix the items below to keep the cycle moving.",
            className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
            Icon: Info,
          }
        : {
            text: "Your fishless cycle is on track",
            sub: "Ammonia and nitrite are expected while you cycle. Each card says why your reading is fine.",
            className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
            Icon: CheckCircle2,
          };
  }
  // A number that can't be real (a typo, Celsius, a missing decimal point) gets
  // "check this" first, unless something real is already an emergency.
  if (banner && waterResult.status !== "danger" && waterResult.findings.some((f) => f.check)) {
    banner = {
      text: "Double-check a reading",
      sub: "One of your numbers doesn't look like a real test result, so it wasn't checked. See below.",
      className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      Icon: Info,
    };
  }

  // ---- Phones: summary first, details on request; wide screens show everything ----
  const [showDetails, setShowDetails] = useState(false);
  function openCard(id: string) {
    setShowDetails(true);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  const resultsRef = useRef<HTMLDivElement>(null);
  const [resultsOnScreen, setResultsOnScreen] = useState(false);
  useEffect(() => {
    if (!verdictBar) return;
    const el = resultsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setResultsOnScreen(e.isIntersecting), { rootMargin: "0px 0px -35% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [verdictBar]);

  // ---- Logging and history ----
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [readings, setReadings] = useState<WaterLog[]>([]);
  const [showAllReadings, setShowAllReadings] = useState(false);

  const refreshReadings = useCallback(
    async (tid: string) => {
      const { data, error } = await supabase
        .from("water_logs")
        .select("id,measured_at,temp_f,ph,ammonia_ppm,nitrite_ppm,nitrate_ppm,gh,kh,note")
        .eq("tank_id", tid)
        .order("measured_at", { ascending: false })
        .limit(20);
      setReadings(error ? [] : ((data as WaterLog[]) ?? []));
    },
    [supabase]
  );

  useEffect(() => {
    setMsg(null);
    setShowAllReadings(false);
    if (userId && tankId) refreshReadings(tankId);
    else setReadings([]);
  }, [userId, tankId, refreshReadings]);

  async function logReading() {
    if (!userId || busy || ensureBusy) return;
    if (waterResult.status === "empty") {
      setMsg({ ok: false, text: "Enter at least one value first." });
      return;
    }
    // No tank yet: the Tank Builder saves the build first, so logging never dead-ends.
    const tid = tankId ?? (ensureTank ? await ensureTank() : null);
    if (!tid) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("water_logs").insert({
      tank_id: tid,
      user_id: userId,
      measured_at: new Date().toISOString(),
      ...reading,
      note: note.trim() || (fishless ? "Fishless cycle" : null),
    });
    if (error) setMsg({ ok: false, text: "Couldn't log the reading. Please try again." });
    else {
      setMsg({ ok: true, text: "Reading logged." });
      setNote("");
      ping("first_water_test");
      ping("water_log_streak_week");
      await refreshReadings(tid);
    }
    setBusy(false);
  }

  async function deleteReading(id: string) {
    if (busy) return;
    if (!window.confirm("Delete this reading?")) return;
    setBusy(true);
    const { error } = await supabase.from("water_logs").delete().eq("id", id);
    if (error) setMsg({ ok: false, text: "Couldn't delete that reading." });
    else if (tankId) await refreshReadings(tankId);
    setBusy(false);
  }

  const canLog = !!userId && (!!tankId || !!ensureTank);
  const shownReadings = showAllReadings ? readings : readings.slice(0, 5);

  // ---- Pieces ----
  const form = (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400">Your reading</h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={fishless}
            onClick={() => onFishlessChange(!fishless)}
            className="flex items-center gap-2 text-xs text-ocean-200 hover:text-white"
          >
            <span className={"relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors " + (fishless ? "bg-emerald-500" : "bg-ocean-700")}>
              <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all " + (fishless ? "left-[18px]" : "left-0.5")} />
            </span>
            Fishless cycle
          </button>
          <button type="button" onClick={() => onWaterChange(EMPTY_WATER)} className="text-xs text-ocean-400 transition-colors hover:text-white">
            Clear
          </button>
        </div>
      </div>
      <p className="-mt-3 mb-5 text-xs text-ocean-400">
        {fishless
          ? "Fishless cycle is on: no fish in the tank yet, so ammonia and nitrite are expected and the advice changes."
          : "Fill in only what your kit tests. Cycling a new tank with no fish yet? Turn on Fishless cycle."}
      </p>
      {/* Cyclers test every day or two and run through kits; the empty state below covers first-timers. */}
      {fishless && waterResult.status !== "empty" && (
        <div className="-mt-2 mb-5">
          <TestKitPick spot="fishless" compact />
        </div>
      )}

      <div className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-1 flex items-center gap-2">
              <group.Icon className="h-4 w-4 text-emerald-400/80" />
              <h3 className="text-sm font-medium text-white">{group.title}</h3>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-ocean-400">{group.blurb}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.fields.map((f) => {
                const filled = water[f.key].trim() !== "";
                const level = filled ? levelByParam[f.parameter] : undefined;
                const id = `${idPrefix}-w-${f.key}`;
                return (
                  <div key={f.key}>
                    <label htmlFor={id} className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-400">
                      {filled && <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotFor(level)}`} />}
                      {f.label}
                      {f.key === "temp_f" && toC(water.temp_f) && (
                        <span className="ml-auto normal-case tracking-normal text-ocean-300">= {toC(water.temp_f)}°C</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        step={f.step}
                        value={water[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className={
                          "w-full rounded-lg border bg-white/5 px-3 py-2.5 text-base text-white transition-colors placeholder:text-ocean-500 focus:bg-white/10 focus:outline-none sm:text-sm " +
                          ringFor(level, filled) +
                          (f.unit ? " pr-12" : "")
                        }
                      />
                      {f.unit && (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ocean-500">{f.unit}</span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-ocean-500">{f.hint}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {noStockHint && stock.length === 0 && <p className="mt-5 text-xs leading-relaxed text-ocean-500">{noStockHint}</p>}
    </div>
  );

  const results =
    waterResult.status === "empty" ? (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
        <Droplets className="mx-auto mb-3 h-8 w-8 text-ocean-600" />
        <p className="mb-1 font-medium text-white">Enter a reading to begin</p>
        <p className="text-sm text-ocean-400">Fill in at least one value and your results appear here.</p>
        <TestKitPick spot={fishless ? "fishless-empty" : "water-check-empty"} />
      </div>
    ) : (
      <>
        {banner && (
          <div className={"rounded-2xl border px-5 py-4 " + banner.className}>
            <div className="flex items-center gap-2.5">
              <banner.Icon className="h-5 w-5 shrink-0" />
              <span className="text-base font-medium">{banner.text}</span>
            </div>
            <p className="mt-1 text-sm opacity-80">{banner.sub}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dangerCount > 0 && (
                <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-300">
                  {dangerCount} need{dangerCount === 1 ? "s" : ""} action
                </span>
              )}
              {warnCount > 0 && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">{warnCount} to watch</span>}
              {noteCount > 0 && <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs text-sky-300">{noteCount} heads-up</span>}
              {okCount > 0 && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">{okCount} healthy</span>}
            </div>
          </div>
        )}

        {/* At a glance: one dot per reading, worst first. Tap a row for its details. */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="px-1 pb-2 text-[11px] uppercase tracking-wide text-ocean-400">At a glance</p>
          <ul className="divide-y divide-white/5">
            {[...detailed, ...healthy].map((f, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => openCard(`${idPrefix}-card-${i}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left hover:bg-white/5"
                >
                  <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + dotFor(f.level)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{f.title}</span>
                    {!f.title.toLowerCase().includes(f.parameter.toLowerCase()) && (
                      <span className="block truncate text-xs text-ocean-400">{f.parameter}</span>
                    )}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-ocean-300">{f.value}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className={
            "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium xl:hidden " +
            (showDetails
              ? "border-white/10 text-ocean-300 hover:text-white"
              : dangerCount + warnCount > 0
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
              : "border-white/10 bg-white/5 text-ocean-200 hover:text-white")
          }
        >
          {showDetails ? "Hide details" : plans.length > 0 ? "See what to do" : detailed.length > 0 ? "See what to do and why" : "See more"}
          <ChevronDown className={"h-4 w-4 transition-transform " + (showDetails ? "rotate-180" : "")} />
        </button>

        <div className={(showDetails ? "" : "hidden ") + "space-y-6 xl:block"}>
          {plans.map((p) => (
            <WaterPlanCard key={p.title} plan={p} />
          ))}

          {detailed.length > 0 && (
            <div className="space-y-2">
              {plans.length > 0 && <p className="pt-1 text-[11px] uppercase tracking-wide text-ocean-400">Each reading</p>}
              {detailed.map((f, i) => {
                const st = findingStyle(f.level);
                return (
                  <div key={i} id={`${idPrefix}-card-${i}`} className={"flex scroll-mt-32 gap-3 rounded-xl border p-4 " + st.box}>
                    <st.I className={"mt-0.5 h-5 w-5 shrink-0 " + st.icon} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-white">{f.title}</p>
                        <span className="shrink-0 whitespace-nowrap text-xs text-ocean-400">{f.value}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-ocean-300">{f.whatsHappening}</p>
                      {covered.has(f.parameter) && f.level !== "ok" ? (
                        <p className="mt-2 text-xs leading-relaxed text-ocean-400">Covered in the plan above.</p>
                      ) : (
                        <p className="mt-2 text-xs leading-relaxed text-ocean-400">
                          <span className="font-medium text-ocean-200">How to fix: </span>
                          {f.howToFix}
                        </p>
                      )}
                      {GLOSSARY_FOR[f.parameter] && (
                        <Link
                          href={`/glossary/${GLOSSARY_FOR[f.parameter].slug}`}
                          className="mt-2 inline-block text-xs text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
                        >
                          More about {GLOSSARY_FOR[f.parameter].label} in the glossary
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {healthy.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-[11px] uppercase tracking-wide text-ocean-400">Looking good</p>
              <div className="space-y-2">
                {healthy.map((f, i) => (
                  <div key={i} id={`${idPrefix}-card-${detailed.length + i}`} className="scroll-mt-32">
                    <div className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-ocean-200">{f.title}</span>
                      <span className="ml-auto whitespace-nowrap text-xs text-ocean-500">{f.value}</span>
                    </div>
                    {/* In a fishless cycle "fine" often looks alarming, so say why. */}
                    {fishless && <p className="ml-[26px] mt-0.5 text-xs leading-relaxed text-ocean-400">{f.whatsHappening}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );

  const logCard = canLog ? (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-1 text-sm font-semibold text-white">{tankId ? "Log this reading" : "Track this over time"}</h3>
      <p className="mb-3 text-xs text-ocean-400">
        {tankId
          ? `Adds a dated entry to “${tankName?.trim() || "My Tank"}” so you can watch changes over time.`
          : "Readings attach to a saved tank. This saves your build and logs the reading in one step."}
      </p>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        placeholder="Optional note (e.g. after a 30% water change)"
        className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none sm:text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={logReading}
          disabled={busy || ensureBusy || waterResult.status === "empty"}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {busy ? "Logging…" : tankId ? "Log reading" : "Save tank & log reading"}
        </button>
        {msg && <span className={`text-xs ${msg.ok ? "text-emerald-300" : "text-coral-300"}`}>{msg.text}</span>}
      </div>
    </div>
  ) : !userId && signInNext ? (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-ocean-300">
      <Link
        href={joinHref("water-check", signInNext)}
        onClick={() => trackJoinClick("water-check")}
        className="font-medium text-emerald-400 hover:text-emerald-300"
      >
        Join free
      </Link>{" "}
      or{" "}
      <Link
        href={loginHref("water-check", signInNext)}
        onClick={() => trackJoinClick("water-check")}
        className="font-medium text-emerald-400 hover:text-emerald-300"
      >
        sign in
      </Link>{" "}
      to log readings and track your water over time.
    </div>
  ) : null;

  const history =
    userId && tankId && readings.length > 0 ? (
      <>
        {readings.length > 1 && <WaterTrends readings={readings} />}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">Recent readings</h3>
            {readings.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllReadings((v) => !v)}
                className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
              >
                {showAllReadings ? "Show fewer" : `Show all ${readings.length}`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {shownReadings.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ocean-400">{fmtReadingDate(r.measured_at)}</p>
                  <p className="mt-0.5 break-words text-sm text-white">{readingSummary(r)}</p>
                  {r.note && <p className="mt-1 break-words text-xs italic text-ocean-400">{r.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteReading(r.id)}
                  aria-label="Delete reading"
                  disabled={busy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ocean-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </>
    ) : null;

  const resultsColumn = (
    <div
      ref={resultsRef}
      id={`${idPrefix}-water-results`}
      className={"scroll-mt-32 space-y-6 " + (layout === "split" ? "xl:sticky xl:top-24" : "")}
    >
      {results}
      {beforeLog}
      {logCard}
      {history}
    </div>
  );

  return (
    <>
      {layout === "split" ? (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {form}
          {resultsColumn}
        </div>
      ) : (
        <div className="space-y-6">
          {form}
          {resultsColumn}
        </div>
      )}

      {verdictBar && banner && !resultsOnScreen && (
        <button
          type="button"
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={
            "fixed inset-x-3 z-30 bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] md:bottom-4 xl:hidden " +
            "flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left shadow-2xl backdrop-blur-xl " +
            banner.className.replace(/bg-[a-z]+-500\/10/, "bg-ocean-950/95")
          }
        >
          <banner.Icon className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{banner.text}</span>
            <span className="block text-xs opacity-80">
              {[
                dangerCount > 0 && `${dangerCount} need${dangerCount === 1 ? "s" : ""} action`,
                warnCount > 0 && `${warnCount} to watch`,
                noteCount > 0 && `${noteCount} heads-up`,
                okCount > 0 && `${okCount} healthy`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium">
            See results <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      )}
    </>
  );
}
