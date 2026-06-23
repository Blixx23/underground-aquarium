"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Info,
  Fish,
  Thermometer,
  FlaskConical,
  Gauge,
} from "lucide-react";
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

type Field = {
  key: WaterFieldKey;
  parameter: string; // matches WaterFinding.parameter from the engine
  label: string;
  unit: string;
  placeholder: string;
  step: string;
  hint: string;
};

const GROUPS: {
  title: string;
  blurb: string;
  Icon: typeof Thermometer;
  fields: Field[];
}[] = [
  {
    title: "Temperature & pH",
    blurb: "The basics — comfort and acidity.",
    Icon: Thermometer,
    fields: [
      { key: "temp_f", parameter: "Temperature", label: "Temperature", unit: "°F", placeholder: "78", step: "1", hint: "Safe 66–86°F · most like 74–80" },
      { key: "ph", parameter: "pH", label: "pH", unit: "", placeholder: "7.2", step: "0.1", hint: "Safe 6.0–8.4 · ideal varies by fish" },
    ],
  },
  {
    title: "The nitrogen cycle",
    blurb: "Fish waste turns to ammonia, then nitrite, then nitrate. This is where most trouble shows up.",
    Icon: FlaskConical,
    fields: [
      { key: "ammonia_ppm", parameter: "Ammonia", label: "Ammonia", unit: "ppm", placeholder: "0", step: "0.25", hint: "Should be 0" },
      { key: "nitrite_ppm", parameter: "Nitrite", label: "Nitrite", unit: "ppm", placeholder: "0", step: "0.25", hint: "Should be 0" },
      { key: "nitrate_ppm", parameter: "Nitrate", label: "Nitrate", unit: "ppm", placeholder: "10", step: "5", hint: "Keep under 20" },
    ],
  },
  {
    title: "Hardness",
    blurb: "How mineral-rich your water is, and how stable your pH stays.",
    Icon: Gauge,
    fields: [
      { key: "gh", parameter: "GH", label: "GH", unit: "dGH", placeholder: "8", step: "1", hint: "Soft 4–8, hard 8–12" },
      { key: "kh", parameter: "KH", label: "KH", unit: "dKH", placeholder: "5", step: "1", hint: "3+ keeps pH steady" },
    ],
  },
];

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
  if (level === "danger")
    return { box: "border-red-500/30 bg-red-500/5", icon: "text-red-400", I: AlertTriangle };
  if (level === "warning")
    return { box: "border-amber-500/30 bg-amber-500/5", icon: "text-amber-400", I: AlertTriangle };
  if (level === "note")
    return { box: "border-sky-500/30 bg-sky-500/5", icon: "text-sky-400", I: Info };
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

  const waterResult = useMemo(() => checkWater(reading, []), [reading]);

  // Map each parameter to its result level so inputs can colour themselves live.
  const levelByParam = useMemo(() => {
    const m: Record<string, WaterLevel> = {};
    for (const f of waterResult.findings) m[f.parameter] = f.level;
    return m;
  }, [waterResult]);

  function setWaterField(key: WaterFieldKey, value: string) {
    setWater((prev) => ({ ...prev, [key]: value }));
  }

  const order: Record<WaterLevel, number> = { danger: 0, warning: 1, note: 2, ok: 3 };
  const detailed = waterResult.findings
    .filter((f) => f.level !== "ok")
    .sort((a, b) => order[a.level] - order[b.level]);
  const healthy = waterResult.findings.filter((f) => f.level === "ok");
  const dangerCount = waterResult.findings.filter((f) => f.level === "danger").length;
  const warnCount = waterResult.findings.filter((f) => f.level === "warning").length;
  const noteCount = waterResult.findings.filter((f) => f.level === "note").length;
  const okCount = healthy.length;

  let banner: { text: string; sub: string; className: string; Icon: typeof CheckCircle2 } | null = null;
  if (waterResult.status === "danger") {
    banner = {
      text: "Needs attention now",
      sub: "Something in your water is stressing your fish — see the steps below.",
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
            text: "Looking good — a couple of notes",
            sub: "Nothing's wrong. A few values sit at the edge of the ideal range — details below.",
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
            Enter your test-kit numbers and get a plain-English read on what&apos;s
            healthy, what isn&apos;t, and exactly how to fix it. Enter only what you
            have — no account needed.
          </p>
        </div>

        <div className="space-y-6">
          {/* Grouped reading form */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-5">
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

            <div className="space-y-6">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="flex items-center gap-2 mb-1">
                    <group.Icon className="w-4 h-4 text-emerald-400/80" />
                    <h3 className="text-sm font-medium text-white">
                      {group.title}
                    </h3>
                  </div>
                  <p className="text-ocean-400 text-xs mb-3 leading-relaxed">
                    {group.blurb}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {group.fields.map((f) => {
                      const filled = water[f.key].trim() !== "";
                      const level = filled ? levelByParam[f.parameter] : undefined;
                      return (
                        <div key={f.key}>
                          <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-400 mb-1">
                            {filled && (
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full ${dotFor(level)}`}
                              />
                            )}
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
                                "w-full rounded-lg bg-white/5 border px-3 py-2.5 text-sm text-white placeholder:text-ocean-500 focus:outline-none focus:bg-white/10 transition-colors " +
                                ringFor(level, filled) +
                                (f.unit ? " pr-12" : "")
                              }
                            />
                            {f.unit && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-500 text-xs pointer-events-none">
                                {f.unit}
                              </span>
                            )}
                          </div>
                          <p className="text-ocean-600 text-[11px] mt-1">{f.hint}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {waterResult.status === "empty" ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
              <Droplets className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">Enter a reading to begin</p>
              <p className="text-ocean-400 text-sm">
                Fill in at least one value above and your results appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Summary banner */}
              {banner && (
                <div className={"rounded-2xl border px-5 py-4 " + banner.className}>
                  <div className="flex items-center gap-2.5">
                    <banner.Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-base">{banner.text}</span>
                  </div>
                  <p className="text-sm mt-1 opacity-80">{banner.sub}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {dangerCount > 0 && (
                      <span className="rounded-full bg-red-500/15 text-red-300 text-xs px-2.5 py-1">
                        {dangerCount} need{dangerCount === 1 ? "s" : ""} action
                      </span>
                    )}
                    {warnCount > 0 && (
                      <span className="rounded-full bg-amber-500/15 text-amber-300 text-xs px-2.5 py-1">
                        {warnCount} to watch
                      </span>
                    )}
                    {noteCount > 0 && (
                      <span className="rounded-full bg-sky-500/15 text-sky-300 text-xs px-2.5 py-1">
                        {noteCount} heads-up
                      </span>
                    )}
                    {okCount > 0 && (
                      <span className="rounded-full bg-emerald-500/15 text-emerald-300 text-xs px-2.5 py-1">
                        {okCount} healthy
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Anything that warrants a note, sorted by severity */}
              {detailed.length > 0 && (
                <div className="space-y-2">
                  {detailed.map((f, i) => {
                    const st = findingStyle(f.level);
                    return (
                      <div key={i} className={"rounded-xl border p-4 flex gap-3 " + st.box}>
                        <st.I className={"w-5 h-5 shrink-0 mt-0.5 " + st.icon} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-white text-sm font-medium">{f.title}</p>
                            <span className="text-ocean-400 text-xs shrink-0 whitespace-nowrap">
                              {f.value}
                            </span>
                          </div>
                          <p className="text-ocean-300 text-sm mt-1 leading-relaxed">
                            {f.whatsHappening}
                          </p>
                          <p className="text-ocean-400 text-xs mt-2 leading-relaxed">
                            <span className="text-ocean-200 font-medium">How to fix: </span>
                            {f.howToFix}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Healthy — compact confirmations */}
              {healthy.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-ocean-400 mb-3">
                    Looking good
                  </p>
                  <div className="space-y-2">
                    {healthy.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span className="text-ocean-200">{f.title}</span>
                        <span className="text-ocean-500 text-xs ml-auto whitespace-nowrap">
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
