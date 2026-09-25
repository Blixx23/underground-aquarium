"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Fish, Link2, Plus } from "lucide-react";

export type QueueSuggestion = {
  id: string;
  common_name: string;
  scientific_name: string | null;
  note: string | null;
  created_at: string | null;
  suggester_username: string | null;
  suggester_name: string | null;
  /** Library fish with overlapping names, best first. */
  matches: { slug: string; common_name: string }[];
};

export type LibraryFish = {
  slug: string;
  common_name: string;
  scientific_name: string | null;
  also_known_as: string[] | null;
  group_name: string | null;
};

const OPTIONS = {
  water_type: ["Freshwater", "Brackish"],
  temperament: ["Peaceful", "Semi-aggressive", "Aggressive"],
  social: ["Schooling", "Groups", "Social", "Pairs", "Solitary", "Colony", "Harem"],
  swim_level: ["Top", "Mid-top", "Middle", "Mid-bottom", "Bottom", "All"],
  diet: ["Omnivore", "Carnivore", "Herbivore"],
  care_level: ["Beginner", "Intermediate", "Advanced", "Expert"],
  suitability: ["Common", "Intermediate", "Advanced", "Expert", "Kept but not recommended"],
  breeding_type: [
    "Egg-scatterer",
    "Egg-depositor",
    "Egg-layer",
    "Substrate spawner",
    "Cave spawner",
    "Mouthbrooder",
    "Bubble-nester",
    "Livebearer",
  ],
} as const;

function whenLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminSpeciesList({
  initialSuggestions,
  groups,
  library,
}: {
  initialSuggestions: QueueSuggestion[];
  groups: string[];
  library: LibraryFish[];
}) {
  const [items, setItems] = useState(initialSuggestions);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400">
        No species requests waiting.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {items.map((s) => (
        <Request
          key={s.id}
          s={s}
          groups={groups}
          library={library}
          onDone={() => setItems((prev) => prev.filter((x) => x.id !== s.id))}
        />
      ))}
    </div>
  );
}

function Request({
  s,
  groups,
  library,
  onDone,
}: {
  s: QueueSuggestion;
  groups: string[];
  library: LibraryFish[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "create" | "alias" | "dismiss">("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aliasSlug, setAliasSlug] = useState(s.matches[0]?.slug ?? "");
  const [aliasQuery, setAliasQuery] = useState("");
  const [note, setNote] = useState("");
  const [f, setF] = useState<Record<string, string>>({
    common_name: s.common_name,
    scientific_name: s.scientific_name ?? "",
    group_name: "",
    water_type: "Freshwater",
    temp_min_f: "",
    temp_max_f: "",
    ph_min: "",
    ph_max: "",
    gh_min: "",
    gh_max: "",
    max_size_in: "",
    min_tank_gal: "",
    temperament: "Peaceful",
    social: "Schooling",
    min_group_size: "",
    swim_level: "Middle",
    diet: "Omnivore",
    care_level: "Beginner",
    suitability: "Common",
    breeding_type: "",
    lifespan: "",
    family: "",
    origin: "",
    summary: "",
    body: "",
  });
  const set = (k: string, v: string) => setF((cur) => ({ ...cur, [k]: v }));

  const aliasOptions = useMemo(() => {
    const q = aliasQuery.trim().toLowerCase();
    if (!q) return [];
    return library
      .filter(
        (x) =>
          x.common_name.toLowerCase().includes(q) ||
          (x.scientific_name ?? "").toLowerCase().includes(q) ||
          (x.also_known_as ?? []).some((a) => a.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [aliasQuery, library]);

  async function send(action: "create" | "alias" | "dismiss") {
    setError(null);
    let species: Record<string, unknown> | null = null;
    if (action === "create") {
      const need = ["group_name", "temp_min_f", "temp_max_f", "max_size_in", "min_tank_gal"];
      const missing = need.filter((k) => !f[k].trim());
      if (missing.length) {
        setError("Fill in group, temperature, adult size and minimum tank. The Tank Builder needs them.");
        return;
      }
      species = {};
      for (const [k, v] of Object.entries(f)) if (v.trim() !== "") species[k] = v.trim();
    }
    if (action === "alias" && !aliasSlug) {
      setError("Pick the fish it's another name for.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/species-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: s.id,
          action,
          species,
          existingSlug: action === "alias" ? aliasSlug : null,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const who = s.suggester_username ? `@${s.suggester_username}` : s.suggester_name || "a member";
  const input =
    "w-full rounded-lg border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white placeholder:text-ocean-600 focus:border-emerald-500/50 focus:outline-none";
  const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ocean-400";

  const field = (k: string, text: string, opts?: { type?: string; step?: string; placeholder?: string }) => (
    <div>
      <label className={label} htmlFor={`${s.id}-${k}`}>
        {text}
      </label>
      <input
        id={`${s.id}-${k}`}
        type={opts?.type ?? "text"}
        step={opts?.step}
        value={f[k]}
        placeholder={opts?.placeholder}
        onChange={(e) => set(k, e.target.value)}
        className={input}
      />
    </div>
  );
  const select = (k: keyof typeof OPTIONS | "group_name", text: string, values: readonly string[]) => (
    <div>
      <label className={label} htmlFor={`${s.id}-${k}`}>
        {text}
      </label>
      <select id={`${s.id}-${k}`} value={f[k]} onChange={(e) => set(k, e.target.value)} className={input}>
        {k === "group_name" || k === "breeding_type" ? <option value="">Choose…</option> : null}
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ocean-800/50">
          <Fish className="h-5 w-5 text-ocean-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-white">{s.common_name}</h3>
          {s.scientific_name && <p className="text-sm italic text-ocean-300">{s.scientific_name}</p>}
          <p className="mt-0.5 text-xs text-ocean-500">
            Requested by {who}
            {s.created_at ? ` · ${whenLabel(s.created_at)}` : ""}
          </p>
          {s.note && <p className="mt-2 whitespace-pre-line break-words text-sm text-ocean-200">{s.note}</p>}
          {s.matches.length > 0 && (
            <p className="mt-2 text-xs text-ocean-400">
              Similar in library:{" "}
              {s.matches.map((m, i) => (
                <span key={m.slug}>
                  {i > 0 && ", "}
                  <a href={`/species/${m.slug}`} target="_blank" className="text-emerald-300 hover:underline">
                    {m.common_name}
                  </a>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["create", "Add to library", Plus],
            ["alias", "Another name for…", Link2],
            ["dismiss", "Turn down", X],
          ] as const
        ).map(([m, text, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(mode === m ? "none" : m)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === m
                ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                : "border-ocean-700/60 text-ocean-200 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" /> {text}
          </button>
        ))}
      </div>

      {mode === "create" && (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {field("common_name", "Common name")}
            {field("scientific_name", "Scientific name")}
            {select("group_name", "Group", groups)}
            {select("water_type", "Water", OPTIONS.water_type)}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {field("temp_min_f", "Temp low °F", { type: "number" })}
            {field("temp_max_f", "Temp high °F", { type: "number" })}
            {field("ph_min", "pH low", { type: "number", step: "0.1" })}
            {field("ph_max", "pH high", { type: "number", step: "0.1" })}
            {field("gh_min", "GH low", { type: "number" })}
            {field("gh_max", "GH high", { type: "number" })}
            {field("max_size_in", 'Adult size (")', { type: "number", step: "0.1" })}
            {field("min_tank_gal", "Min tank (gal)", { type: "number" })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {select("temperament", "Temperament", OPTIONS.temperament)}
            {select("social", "Social", OPTIONS.social)}
            {field("min_group_size", "Min group", { type: "number", placeholder: "e.g. 6" })}
            {select("swim_level", "Swims", OPTIONS.swim_level)}
            {select("diet", "Diet", OPTIONS.diet)}
            {select("care_level", "Care", OPTIONS.care_level)}
            {select("suitability", "Suitability", OPTIONS.suitability)}
            {select("breeding_type", "Breeding", OPTIONS.breeding_type)}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {field("family", "Family")}
            {field("lifespan", "Lifespan", { placeholder: "e.g. 5-8 years" })}
            {field("origin", "Origin")}
          </div>
          <div>
            <label className={label}>Summary (one line)</label>
            <input value={f.summary} maxLength={140} onChange={(e) => set("summary", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Care notes (2-3 sentences)</label>
            <textarea value={f.body} rows={3} onChange={(e) => set("body", e.target.value)} className={input} />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => send("create")}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add to library and reward
          </button>
        </div>
      )}

      {mode === "alias" && (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-ocean-200">
            “{s.common_name}” gets added as another name, so people searching it find the right fish.
          </p>
          <div className="flex flex-wrap gap-2">
            {s.matches.map((m) => (
              <button
                key={m.slug}
                type="button"
                onClick={() => setAliasSlug(m.slug)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  aliasSlug === m.slug ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : "border-white/10 text-ocean-200"
                }`}
              >
                {m.common_name}
              </button>
            ))}
          </div>
          <input
            value={aliasQuery}
            onChange={(e) => setAliasQuery(e.target.value)}
            placeholder="Or search the library…"
            className={input}
          />
          {aliasOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aliasOptions.map((o) => (
                <button
                  key={o.slug}
                  type="button"
                  onClick={() => setAliasSlug(o.slug)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    aliasSlug === o.slug ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : "border-white/10 text-ocean-200"
                  }`}
                >
                  {o.common_name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={busy || !aliasSlug}
            onClick={() => send("alias")}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add name and reward
          </button>
        </div>
      )}

      {mode === "dismiss" && (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Optional note for them (e.g. that's a saltwater fish, or it's a made-up trade name)"
            className={input}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => send("dismiss")}
            className="inline-flex items-center gap-2 rounded-lg border border-coral-500/40 px-5 py-2.5 text-sm font-semibold text-coral-300 hover:bg-coral-500/10 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Turn down
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-coral-300">{error}</p>}
    </div>
  );
}
