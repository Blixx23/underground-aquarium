"use client";

import { useState } from "react";

export type Point = { day: string; value: number };

function label(iso: string, style: "short" | "long") {
  const d = new Date(`${iso}T12:00:00`);
  return style === "long"
    ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Daily bars for one measure: a scale, dates along the bottom, and tap or
 * hover to read any day. One series at a time, so nothing shares an axis
 * it shouldn't.
 */
export default function DayBars({ points, unit, height = 160 }: { points: Point[]; unit: string; height?: number }) {
  const [pick, setPick] = useState<number | null>(null);
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 0);
  const top =
    max <= 0
      ? 1
      : [1, 2, 5]
          .map((m) => m * 10 ** Math.floor(Math.log10(max)))
          .concat(10 ** Math.ceil(Math.log10(max + 1)))
          .find((t) => t >= max)!;
  const shown = pick ?? values.length - 1;
  const every = points.length <= 10 ? 1 : points.length <= 35 ? 7 : 14;
  const gap = points.length <= 10 ? 8 : points.length <= 35 ? 2 : 1;

  if (!points.length || max === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-ocean-400" style={{ height }}>
        No {unit} in this period yet.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 min-h-[1.25rem] text-sm text-ocean-300" aria-live="polite">
        <span className="font-semibold text-white">{values[shown].toLocaleString()}</span> {unit} on{" "}
        {label(points[shown].day, "long")}
        {pick === null && <span className="text-ocean-500"> (most recent day · tap a bar for another)</span>}
      </p>
      <div className="relative pl-9" style={{ height }}>
        <span className="absolute left-0 top-0 w-8 text-right font-mono text-[10px] text-ocean-500">{top.toLocaleString()}</span>
        {top >= 2 && (
          <span className="absolute left-0 top-1/2 w-8 -translate-y-1/2 text-right font-mono text-[10px] text-ocean-600">
            {(top / 2).toLocaleString()}
          </span>
        )}
        <span className="absolute bottom-0 left-0 w-8 text-right font-mono text-[10px] text-ocean-500">0</span>
        <div className="pointer-events-none absolute inset-x-9 top-0 border-t border-white/[0.06]" />
        <div className="pointer-events-none absolute inset-x-9 top-1/2 border-t border-dashed border-white/[0.06]" />
        <div className="absolute inset-x-9 bottom-0 border-t border-white/15" />
        <div className="flex h-full items-end" style={{ gap }}>
          {values.map((v, i) => (
            <button
              key={points[i].day}
              type="button"
              onClick={() => setPick(i)}
              onMouseEnter={() => setPick(i)}
              aria-label={`${label(points[i].day, "long")}: ${v} ${unit}`}
              className="group flex h-full flex-1 items-end focus:outline-none"
            >
              <span
                className={`w-full rounded-t-[4px] transition-colors ${i === shown ? "bg-sky-300" : "bg-sky-500/70 group-hover:bg-sky-400"}`}
                style={{ height: v > 0 ? `${Math.max(3, (v / top) * 100)}%` : "2px", opacity: v > 0 ? 1 : 0.35 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex pl-9" style={{ gap }}>
        {points.map((p, i) => (
          <span
            key={p.day}
            className={`flex-1 overflow-visible whitespace-nowrap font-mono text-[10px] text-ocean-500 ${
              i === points.length - 1 && every > 1 ? "text-right" : "text-center"
            }`}
          >
            {(points.length - 1 - i) % every === 0 ? label(p.day, "short") : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{unit} per day</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <th scope="row">{p.day}</th>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
