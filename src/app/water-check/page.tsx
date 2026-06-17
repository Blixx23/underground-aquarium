"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Droplets, AlertTriangle, CheckCircle2, Info, Fish } from "lucide-react";
import {
  checkWater,
  type WaterReading,
  type WaterLevel,
} from "@/lib/waterCheck/engine";

type WaterFieldKey =
  | "temp_f"
  | "ph"
  | "ammonia_ppm"
  | "nitrite_ppm"
  | "nitrate_ppm"
  | "gh"
  | "kh";

const EMPTY_WATER: Record<WaterFieldKey, string> = {
  temp_f: "",
  ph: "",
  ammonia_ppm: "",
  nitrite_ppm: "",
  nitrate_ppm: "",
  gh: "",
  kh: "",
};

const WATER_FIELDS: {
  key: WaterFieldKey;
  label: string;
  unit: string;
  placeholder: string;
  step: string;
}[] = [
  { key: "temp_f", label: "Temperature", unit: "°F", placeholder: "e.g. 78", step: "1" },
  { key: "ph", label: "pH", unit: "", placeholder: "e.g. 7.2", step: "0.1" },
  { key: "ammonia_ppm", label: "Ammonia", unit: "ppm", placeholder: "e.g. 0", step: "0.25" },
  { key: "nitrite_ppm", label: "Nitrite", unit: "ppm", placeholder: "e.g. 0", step: "0.25" },
  { key: "nitrate_ppm", label: "Nitrate", unit: "ppm", placeholder: "e.g. 10", step: "5" },
  { key: "gh", label: "GH", unit: "dGH", placeholder: "e.g. 8", step: "1" },
  { key: "kh", label: "KH", unit: "dKH", placeholder: "e.g. 5", step: "1" },
];

// Same colour language as the Tank Builder.
function findingStyle(level: WaterLevel) {
  if (level === "danger")
    return { box: "border-red-500/30 bg-red-500/5", icon: "text-red-400", I: AlertTriangle };
  if (level === "warning")
    return { box: "border-amber-500/30 bg-amber-500/5", icon: "text-amber-400", I: AlertTriangle };
  if (level === "ok")
    return { box: "border-emerald-500/30 bg-emerald-500/5", icon: "text-emerald-400", I: CheckCircle2 };
  return { box: "border-white/10 bg-white/5", icon: "text-ocean-400", I: Info };
}

export default function WaterCheckPage() {
  const [water, setWater] = useState<Record<WaterFieldKey, string>>(EMPTY_WATER);

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

  // No fish here — this runs the universal cycle/toxicity checks only.
  const waterResult = useMemo(() => checkWater(reading, []), [reading]);

  function setWaterField(key: WaterFieldKey, value: string) {
    setWater((prev) => ({ ...prev, [key]: value }));
  }

  let waterBanner: { text: string; className: string; Icon: typeof CheckCircle2 } | null = null;
  if (waterResult.status === "danger") {
    waterBanner = {
      text: "Something needs attention now",
      className: "bg-red-500/10 border-red-500/30 text-red-300",
      Icon: AlertTriangle,
    };
  } else if (waterResult.status === "warning") {
    waterBanner = {
      text: "A few things to keep an eye on",
      className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      Icon: Info,
    };
  } else if (waterResult.status === "ok") {
    waterBanner = {
      text: "Your water looks healthy",
      className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      Icon: CheckCircle2,
    };
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-8">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Water Check
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Is your water safe?
          </h1>
          <p className="text-ocean-300">
            Enter your latest test-kit numbers and get a plain-English read on
            what&apos;s healthy, what isn&apos;t, and exactly how to fix it. No
            account needed.
          </p>
        </div>

        <div className="space-y-6">
          {/* Reading form */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400">
                Your reading
              </h2>
              <button
                onClick={() => setWater(EMPTY_WATER)}
                className="text-xs text-ocean-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <p className="text-ocean-400 text-xs mb-4 leading-relaxed">
              Enter whatever you have — you don&apos;t need every box. Leave the
              rest blank.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {WATER_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] uppercase tracking-wide text-ocean-400 mb-1">
                    {f.label}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      step={f.step}
                      value={water[f.key]}
                      onChange={(e) => setWaterField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className={
                        "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-500 focus:outline-none focus:border-emerald-500/40 focus:bg-white/10 transition-colors " +
                        (f.unit ? "pr-12" : "")
                      }
                    />
                    {f.unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-500 text-xs pointer-events-none">
                        {f.unit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status banner */}
          {waterBanner && (
            <div
              className={
                "flex items-center gap-2 rounded-xl border px-4 py-3 " +
                waterBanner.className
              }
            >
              <waterBanner.Icon className="w-5 h-5 shrink-0" />
              <span className="font-medium">{waterBanner.text}</span>
            </div>
          )}

          {/* Findings */}
          {waterResult.status === "empty" ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
              <Droplets className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">
                Enter a reading to begin
              </p>
              <p className="text-ocean-400 text-sm">
                Fill in at least one value above and your results appear here.
              </p>
            </div>
          ) : waterResult.findings.length > 0 ? (
            <div className="space-y-2">
              {waterResult.findings.map((f, i) => {
                const st = findingStyle(f.level);
                return (
                  <div
                    key={i}
                    className={"rounded-xl border p-4 flex gap-3 " + st.box}
                  >
                    <st.I className={"w-5 h-5 shrink-0 mt-0.5 " + st.icon} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-white text-sm font-medium">
                          {f.title}
                        </p>
                        <span className="text-ocean-400 text-xs shrink-0 whitespace-nowrap">
                          {f.value}
                        </span>
                      </div>
                      <p className="text-ocean-300 text-sm mt-1 leading-relaxed">
                        {f.whatsHappening}
                      </p>
                      <p className="text-ocean-400 text-xs mt-2 leading-relaxed">
                        <span className="text-ocean-300 font-medium">
                          How to fix:{" "}
                        </span>
                        {f.howToFix}
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
                Nothing to flag from what you&apos;ve entered.
              </p>
            </div>
          )}

          {/* Nudge toward the fish-aware tool */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <Link
              href="/tank-builder"
              className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <Fish className="w-4 h-4" />
              Keeping fish? Use the Tank Builder for checks tailored to your stock →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}