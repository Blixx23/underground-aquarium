"use client";

import type { Range, StockItem } from "@/lib/tankBuilder/engine";
import { speciesColor } from "@/components/tank-builder/TankVisual";

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
          {shared ? `Shared: ${fmt(shared.lo)}-${fmt(shared.hi)}${unit}` : "No overlap"}
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
                  title={`${fmt(a)}-${fmt(b)}${unit}`}
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
