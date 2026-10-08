"use client";

import { useEffect, useMemo, useState } from "react";
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
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import WaterPlanCard from "@/components/water/WaterPlanCard";
import { useUrlParam } from "@/lib/hooks/useUrlState";
import { BUILDER_SPECIES_COLUMNS, type Species, type StockItem } from "@/lib/tankBuilder/engine";
import {
  checkWater,
  checkFishlessCycle,
  waterPlans,
  type WaterReading,
  type WaterLevel,
} from "@/lib/waterCheck/engine";

import { fToC1 } from "@/lib/units";
// The Celsius equivalent of a typed Fahrenheit temperature (one formula site-wide: lib/units).
function toC(f: string): string | null {
  const n = parseFloat(f);
  return Number.isFinite(n) && f.trim() !== "" ? String(fToC1(n)) : null;
}

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
    blurb: "The basics: comfort and acidity.",
    Icon: Thermometer,
    fields: [
      { key: "temp_f", parameter: "Temperature", label: "Temperature", unit: "°F", placeholder: "78", step: "1", hint: "Safe 66-86°F (19-30°C) · most like 74-80°F (23-27°C)" },
      { key: "ph", parameter: "pH", label: "pH", unit: "", placeholder: "7.2", step: "0.1", hint: "Safe 6.0-8.4 · ideal varies by fish" },
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
      { key: "gh", parameter: "GH", label: "GH", unit: "dGH", placeholder: "8", step: "1", hint: "Soft 4-8, hard 8-12" },
      { key: "kh", parameter: "KH", label: "KH", unit: "dKH", placeholder: "5", step: "1", hint: "3+ keeps pH steady" },
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

type MyTank = { id: string; name: string; items: { slug: string; qty: number }[] | null };

export default function WaterCheckPage() {
  const [water, setWater] = useState<Record<WaterFieldKey, string>>(EMPTY_WATER);
  // Fishless cycle: no fish yet, so ammonia and nitrite are expected and the rules change.
  // Kept in the address so a shared link opens in the same mode.
  const [mode, setMode] = useUrlParam("mode", "fish");
  const fishless = mode === "fishless";

  // Signed-in members can pick one of their tanks: the check then looks at
  // their actual fish, and the reading can be logged to that tank's history.
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [tanks, setTanks] = useState<MyTank[]>([]);
  const [tankId, setTankId] = useState("");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (uid: string | null) => {
      if (!active) return;
      setUserId(uid);
      if (!uid) return setTanks([]);
      const { data } = await supabase
        .from("tanks")
        .select("id,name,items")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });
      if (active) setTanks((data as MyTank[]) ?? []);
    };
    // Same fallback as the Tank Builder: getUser can come back empty while the
    // navbar is refreshing the session.
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) load(data.user.id);
      else supabase.auth.getSession().then(({ data: s }) => load(s.session?.user?.id ?? null));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    setSaveMsg(null);
    const tank = tanks.find((t) => t.id === tankId);
    const items = Array.isArray(tank?.items) ? tank.items : [];
    if (!tank || items.length === 0) return setStock([]);
    let active = true;
    supabase
      .from("species")
      .select(BUILDER_SPECIES_COLUMNS)
      .in("slug", items.map((i) => i.slug))
      .then(({ data }) => {
        if (!active) return;
        const bySlug = new Map(((data ?? []) as unknown as Species[]).map((sp) => [sp.slug, sp]));
        setStock(
          items
            .map((i) => (bySlug.has(i.slug) ? { species: bySlug.get(i.slug)!, qty: Math.max(1, Number(i.qty) || 1) } : null))
            .filter((x): x is StockItem => x !== null)
        );
      });
    return () => {
      active = false;
    };
  }, [tankId, tanks, supabase]);

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
  const normalPlans = useMemo(() => waterPlans(reading), [reading]);
  const plans = fishless ? (fishlessCheck.plan ? [fishlessCheck.plan] : []) : normalPlans;
  const covered = new Set(plans.flatMap((p) => p.covers));

  async function logReading() {
    if (!userId || !tankId || saving || waterResult.status === "empty") return;
    setSaving(true);
    setSaveMsg(null);
    const { error } = await supabase.from("water_logs").insert({
      tank_id: tankId,
      user_id: userId,
      measured_at: new Date().toISOString(),
      ...reading,
      note: note.trim() || (fishless ? "Fishless cycle" : null),
    });
    if (error) setSaveMsg({ ok: false, text: "Couldn't log the reading. Please try again." });
    else {
      setSaveMsg({ ok: true, text: "Logged. See the history in the Tank Builder." });
      setNote("");
      // Same first-test and weekly-streak bubbles the Tank Builder gives.
      for (const source of ["first_water_test", "water_log_streak_week"]) {
        fetch("/api/bubbles/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        }).catch(() => {});
      }
    }
    setSaving(false);
  }

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

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl text-white sm:text-4xl">Water Check</h1>
          <p className="mt-1 text-ocean-300">
            Enter your test-kit numbers and get a plain-English read on what&apos;s healthy,
            what isn&apos;t, and how to fix it. Fill in only what you have.
          </p>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-2">
          {/* Grouped reading form */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400">
                Your reading
              </h2>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={fishless}
                  onClick={() => setMode(fishless ? "fish" : "fishless")}
                  className="flex items-center gap-2 text-xs text-ocean-200 hover:text-white"
                >
                  <span
                    className={
                      "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors " +
                      (fishless ? "bg-emerald-500" : "bg-ocean-700")
                    }
                  >
                    <span
                      className={
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all " + (fishless ? "left-[18px]" : "left-0.5")
                      }
                    />
                  </span>
                  Fishless cycle
                </button>
                <button
                  onClick={() => setWater(EMPTY_WATER)}
                  className="text-xs text-ocean-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="-mt-3 mb-5 text-xs text-ocean-400">
              {fishless
                ? "Fishless cycle is on: no fish in the tank yet, so ammonia and nitrite are expected and the advice changes."
                : "Cycling a new tank with no fish yet? Turn on Fishless cycle. The rules are different."}
            </p>

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
                            {f.key === "temp_f" && toC(water.temp_f) && (
                              <span className="ml-auto normal-case tracking-normal text-ocean-300">= {toC(water.temp_f)}°C</span>
                            )}
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

          {/* Results stay beside the form on wide screens. */}
          <div className="space-y-6 xl:sticky xl:top-24">
          {/* Empty state */}
          {waterResult.status === "empty" ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
              <Droplets className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">Enter a reading to begin</p>
              <p className="text-ocean-400 text-sm">
                Fill in at least one value and your results appear here.
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

              {plans.map((p) => (
                <WaterPlanCard key={p.title} plan={p} />
              ))}

              {/* Anything that warrants a note, sorted by severity */}
              {detailed.length > 0 && (
                <div className="space-y-2">
                  {plans.length > 0 && (
                    <p className="pt-1 text-[11px] uppercase tracking-wide text-ocean-400">Each reading</p>
                  )}
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
                          {covered.has(f.parameter) && f.level !== "ok" ? (
                            <p className="text-ocean-400 text-xs mt-2 leading-relaxed">Covered in the plan above.</p>
                          ) : (
                            <p className="text-ocean-400 text-xs mt-2 leading-relaxed">
                              <span className="text-ocean-200 font-medium">How to fix: </span>
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

              {/* Healthy: compact confirmations */}
              {healthy.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-ocean-400 mb-3">
                    Looking good
                  </p>
                  <div className="space-y-2">
                    {healthy.map((f, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                          <span className="text-ocean-200">{f.title}</span>
                          <span className="text-ocean-500 text-xs ml-auto whitespace-nowrap">
                            {f.value}
                          </span>
                        </div>
                        {/* In a fishless cycle "fine" often looks alarming, so say why. */}
                        {fishless && (
                          <p className="ml-[26px] mt-0.5 text-xs leading-relaxed text-ocean-400">{f.whatsHappening}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Members: check against a saved tank's fish and log the reading to it. */}
          {userId && tanks.length > 0 ? (
            <div className="rounded-2xl border border-ocean-800/60 bg-white/5 p-4">
              <label htmlFor="wc-tank" className="text-sm font-semibold text-white">
                Check against one of your tanks
              </label>
              <p className="mt-0.5 mb-3 text-xs text-ocean-400">
                Pick a tank to compare these numbers with the fish in it, and save the reading to its history.
              </p>
              <select
                id="wc-tank"
                value={tankId}
                onChange={(e) => setTankId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ocean-950 px-3 py-2.5 text-base text-white focus:border-emerald-500/50 focus:outline-none sm:text-sm"
              >
                <option value="">No tank, just check the water</option>
                {tanks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {tankId && (
                <>
                  <p className="mt-2 text-xs text-ocean-400">
                    {stock.length > 0
                      ? `Checking against the ${stock.length === 1 ? "fish" : `${stock.length} kinds of fish`} in this tank.`
                      : "This tank has no fish yet, so only the general checks apply."}
                  </p>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={200}
                    placeholder="Optional note (e.g. after a 30% water change)"
                    className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none sm:text-sm"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={logReading}
                      disabled={saving || waterResult.status === "empty"}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Log reading to this tank
                    </button>
                    {saveMsg && (
                      <span className={`text-xs ${saveMsg.ok ? "text-emerald-300" : "text-coral-300"}`}>
                        {saveMsg.ok ? (
                          <Link href={`/tank-builder?tank=${tankId}`} className="underline underline-offset-2">
                            {saveMsg.text}
                          </Link>
                        ) : (
                          saveMsg.text
                        )}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <Link
                href="/tank-builder"
                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Fish className="w-4 h-4" />
                {userId
                  ? "Save a tank in the Tank Builder to check readings against your fish and keep a history →"
                  : "Keeping fish? Use the Tank Builder for checks tailored to your stock →"}
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>
    </main>
  );
}
