"use client";

import type { Range, StockItem } from "@/lib/tankBuilder/engine";
import { speciesColor } from "@/components/tank-builder/TankVisual";
import { checkWater, type WaterLevel } from "@/lib/waterCheck/engine";

import { fToC1, tempF } from "@/lib/units";
/** A ring that fills with the build's score. */
export function ScoreDial({ score, label, tone }: { score: number; label: string; tone: "good" | "warn" | "bad" | "none" }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = tone === "good" ? "#34d399" : tone === "warn" ? "#fbbf24" : tone === "bad" ? "#f87171" : "#334155";
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 80 80" className="h-[72px] w-[72px] shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.max(0, Math.min(100, score))) / 100}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s" }}
        />
      </svg>
      <div className="min-w-0">
        <p className="text-3xl font-semibold leading-none text-white tabular-nums">
          {tone === "none" ? "--" : score}
          <span className="ml-0.5 text-sm font-normal text-ocean-400">/100</span>
        </p>
        <p className="mt-1 text-sm font-medium" style={{ color }}>
          {label}
        </p>
      </div>
    </div>
  );
}

/**
 * Each fish's comfortable range as a bar on one scale, with the band they all
 * share highlighted. Makes "why is this a mismatch" obvious at a glance.
 */
export function RangeChart({
  title,
  unit,
  min,
  max,
  stock,
  lo,
  hi,
  shared,
  step = 1,
}: {
  title: string;
  unit: string;
  min: number;
  max: number;
  stock: StockItem[];
  lo: (s: StockItem["species"]) => number | null;
  hi: (s: StockItem["species"]) => number | null;
  shared: Range;
  step?: number;
}) {
  const rows = stock
    .map((it, i) => ({ it, i, a: lo(it.species), b: hi(it.species) }))
    .filter((r) => r.a != null && r.b != null) as { it: StockItem; i: number; a: number; b: number }[];
  if (rows.length === 0) return null;
  const pct = (v: number) => `${((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100}%`;
  const width = (a: number, b: number) =>
    `${Math.max(1.5, ((Math.min(max, b) - Math.max(min, a)) / (max - min)) * 100)}%`;
  const fmt = (v: number) => (step < 1 ? v.toFixed(1) : String(Math.round(v)));
  const ticks: number[] = [];
  const tickStep = (max - min) / 4;
  for (let t = min; t <= max + 0.001; t += tickStep) ticks.push(t);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className={`text-xs ${shared ? "text-emerald-300" : "text-red-300"}`}>
          {shared
            ? `Shared: ${unit === "°F" ? tempF(shared.lo, shared.hi) : `${fmt(shared.lo)}-${fmt(shared.hi)}${unit}`}`
            : "No overlap"}
        </span>
      </div>
      <div className="relative">
        {shared && rows.length > 1 && (
          <div
            className="pointer-events-none absolute inset-y-0 rounded bg-emerald-400/10 ring-1 ring-emerald-400/30"
            style={{ left: `calc(7.5rem + (100% - 7.5rem) * ${(Math.max(min, shared.lo) - min) / (max - min)})`, width: `calc((100% - 7.5rem) * ${Math.max(0.01, (Math.min(max, shared.hi) - Math.max(min, shared.lo)) / (max - min))})` }}
          />
        )}
        <ul className="space-y-1.5">
          {rows.map(({ it, i, a, b }) => (
            <li key={it.species.slug} className="flex items-center gap-2">
              <span className="w-[7rem] shrink-0 truncate text-xs text-ocean-200" title={it.species.common_name}>
                {it.species.common_name}
              </span>
              <span className="relative h-3 flex-1 rounded-full bg-white/[0.06]">
                <span
                  className="absolute inset-y-0 rounded-full"
                  style={{ left: pct(a), width: width(a, b), background: speciesColor(it.species, i), opacity: 0.85 }}
                  title={unit === "°F" ? tempF(a, b) ?? "" : `${fmt(a)}-${fmt(b)}${unit}`}
                />
              </span>
            </li>
          ))}
        </ul>
        <div className="ml-[7.5rem] mt-1 flex justify-between text-[10px] text-ocean-500 tabular-nums">
          {ticks.map((t) => (
            <span key={t}>{fmt(t)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

type TrendReading = {
  measured_at: string;
  temp_f: number | null;
  ph: number | null;
  ammonia_ppm: number | null;
  nitrite_ppm: number | null;
  nitrate_ppm: number | null;
  gh: number | null;
  kh: number | null;
};

type TrendKey = Exclude<keyof TrendReading, "measured_at">;

// Order matters: the numbers most likely to creep up go first.
const TRENDS: { key: TrendKey; label: string; parameter: string; unit: string }[] = [
  { key: "nitrate_ppm", label: "Nitrate", parameter: "Nitrate", unit: " ppm" },
  { key: "ammonia_ppm", label: "Ammonia", parameter: "Ammonia", unit: " ppm" },
  { key: "nitrite_ppm", label: "Nitrite", parameter: "Nitrite", unit: " ppm" },
  { key: "ph", label: "pH", parameter: "pH", unit: "" },
  { key: "temp_f", label: "Temperature", parameter: "Temperature", unit: "°F" },
  { key: "gh", label: "GH", parameter: "GH", unit: " dGH" },
  { key: "kh", label: "KH", parameter: "KH", unit: " dKH" },
];

const LEVEL_COLOR: Record<WaterLevel, string> = {
  ok: "#34d399",
  note: "#38bdf8",
  warning: "#fbbf24",
  danger: "#f87171",
};

/**
 * A small line per value across the saved tests, colored by how the latest
 * one reads. A list of numbers hides a slow nitrate climb; a line shows it.
 */
export function WaterTrends({ readings }: { readings: TrendReading[] }) {
  const sorted = [...readings].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const rows = TRENDS.map((t) => {
    const pts = sorted
      .filter((r) => r[t.key] != null)
      .map((r) => ({ at: r.measured_at, v: r[t.key] as number }))
      .slice(-12);
    return { ...t, pts };
  }).filter((r) => r.pts.length >= 2);
  if (rows.length === 0) return null;

  const W = 120;
  const H = 32;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-1 text-sm font-semibold text-white">Trends</h3>
      <p className="mb-3 text-xs text-ocean-400">Your last {Math.min(12, sorted.length)} tests, oldest on the left.</p>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const vals = r.pts.map((p) => p.v);
          const latest = vals[vals.length - 1];
          const prev = vals[vals.length - 2];
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          const span = max - min || 1;
          const pts = vals
            .map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / span) * (H - 6)).toFixed(1)}`)
            .join(" ");
          const finding = checkWater({ [r.key]: latest }).findings.find((f) => f.parameter === r.parameter);
          const color = LEVEL_COLOR[finding?.level ?? "ok"];
          const diff = Math.round((latest - prev) * 100) / 100;
          const change = diff === 0 ? "same as last test" : `${diff > 0 ? "up" : "down"} ${Math.abs(diff)} since last test`;
          return (
            <li key={r.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0">
                <span className="block text-xs text-ocean-300">{r.label}</span>
                <span className="block text-sm font-semibold tabular-nums" style={{ color }}>
                  {latest}
                  {r.unit}
                </span>
                {r.key === "temp_f" && (
                  <span className="block text-[11px] tabular-nums text-ocean-400">{fToC1(latest)}°C</span>
                )}
              </span>
              <svg viewBox={`0 0 ${W} ${H}`} className="h-8 min-w-0 flex-1" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="w-28 shrink-0 text-right text-[11px] text-ocean-400">{change}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
