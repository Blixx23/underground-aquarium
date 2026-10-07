"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Fish, Link2, Plus, Sparkles, RefreshCw } from "lucide-react";
import { SPECIES_OPTIONS, type AiReview } from "@/lib/species/fields";

// Matches the species_submission_thanks bubble rule (step69 SQL).
const THANKS_BUBBLES = 10;

const DISMISS_REASONS = [
  "That's a saltwater fish. The library is freshwater only.",
  "That's a plant, not an animal.",
  "That's a trade name for a fish we already have.",
  "We couldn't match that name to a real species.",
  "It's already in the library.",
];

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
  /** The saved AI check, if it has run. */
  ai: AiReview | null;
};

export type LibraryFish = {
  slug: string;
  common_name: string;
  scientific_name: string | null;
  also_known_as: string[] | null;
  group_name: string | null;
};

const OPTIONS = SPECIES_OPTIONS;

// One AI check at a time: each reads the whole library, so ten requests
// shouldn't fire ten big calls at once.
let aiChain: Promise<unknown> = Promise.resolve();
function queueAiCheck(id: string, force: boolean): Promise<AiReview> {
  const run = aiChain.then(async () => {
    const res = await fetch("/api/admin/species-suggestions/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, force }),
    });
    const data = (await res.json().catch(() => ({}))) as { review?: AiReview; error?: string };
    if (!res.ok || !data.review) throw new Error(data.error ?? "The AI check failed.");
    return data.review;
  });
  aiChain = run.catch(() => undefined);
  return run;
}

const VERDICT_LABEL: Record<AiReview["verdict"], { text: string; tone: string }> = {
  already_listed: { text: "Already in the library", tone: "border-sky-400/40 bg-sky-500/10 text-sky-200" },
  another_name: { text: "Another name for a fish we have", tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" },
  too_broad: { text: "Too broad: a group, not one species", tone: "border-amber-400/40 bg-amber-400/10 text-amber-200" },
  add_variant: { text: "New variant of a fish we have", tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" },
  add_new: { text: "New: add it to the library", tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" },
  turn_down: { text: "Turn it down", tone: "border-coral-400/40 bg-coral-500/10 text-coral-300" },
  unsure: { text: "Not sure: check it yourself", tone: "border-white/15 bg-white/5 text-ocean-200" },
};

/** What the AI recommends, in one sentence. Older checks have no sentence, so it's built from the verdict. */
function recommendationText(ai: AiReview, nameOf: (slug: string | null | undefined) => string): string {
  if (ai.recommendation) return ai.recommendation;
  switch (ai.verdict) {
    case "another_name":
      return `Add this name to ${nameOf(ai.alias_slug)}.`;
    case "add_variant":
      return `Add it as a variant of ${nameOf(ai.parent_slug)}.`;
    case "add_new":
      return "Add it to the library as a new species.";
    case "unsure":
      return "Check it yourself; see the notes below.";
    default:
      return "Turn it down with the reply below.";
  }
}

/** The AI button says exactly what it sets up. */
function actionLabel(ai: AiReview, nameOf: (slug: string | null | undefined) => string): string {
  switch (ai.verdict) {
    case "another_name":
      return `Add the name to ${nameOf(ai.alias_slug)}`;
    case "add_variant":
      return `Add as a variant of ${nameOf(ai.parent_slug)}`;
    case "add_new":
      return "Add it to the library";
    default:
      return "Turn it down with this reply";
  }
}

/** Checks saved before recommendations, or before the second check for fish that would be added, are redone. */
function needsRecheck(ai: AiReview): boolean {
  if (!ai.recommendation) return true;
  return (ai.verdict === "add_new" || ai.verdict === "add_variant") && !ai.checked_twice;
}

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
  const [thanks, setThanks] = useState(true);
  const [ai, setAi] = useState<AiReview | null>(s.ai);
  const [aiBusy, setAiBusy] = useState(!s.ai || needsRecheck(s.ai));
  const [aiError, setAiError] = useState<string | null>(null);
  // Set when the new entry is a color or fin form of a library fish.
  const [parentSlug, setParentSlug] = useState<string | null>(null);
  // The form opens below the buttons, often off screen: bring it into view so the click visibly does something.
  const formRef = useRef<HTMLDivElement>(null);
  const [scrollToForm, setScrollToForm] = useState(0);
  // The care form is filled from the AI once, so a second open doesn't wipe Chris's edits.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (scrollToForm) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollToForm]);
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
    fin_nipper: "",
    plant_safe: "",
    lifespan: "",
    family: "",
    origin: "",
    summary: "",
    body: "",
  });
  const set = (k: string, v: string) => setF((cur) => ({ ...cur, [k]: v }));

  function runAi(force: boolean) {
    setAiBusy(true);
    setAiError(null);
    queueAiCheck(s.id, force)
      .then(setAi)
      .catch((e) => setAiError(e instanceof Error ? e.message : "The AI check failed."))
      .finally(() => setAiBusy(false));
  }

  // Check every request that hasn't been checked yet, as soon as the page opens.
  // Checks from before recommendations existed are redone so every card gets one.
  useEffect(() => {
    if (!s.ai) runAi(false);
    else if (needsRecheck(s.ai)) runAi(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Put the AI's suggestion into the right form. Nothing is sent until the admin presses the button. */
  function applySuggestion() {
    if (!ai) return;
    setScrollToForm((n) => n + 1);
    if (ai.verdict === "another_name" && ai.alias_slug) {
      setAliasSlug(ai.alias_slug);
      setMode("alias");
    } else if (ai.verdict === "add_new" || (ai.verdict === "add_variant" && ai.parent_slug)) {
      if (!prefilled) setF((cur) => ({ ...cur, ...(ai.species ?? {}) }));
      setPrefilled(true);
      setParentSlug(ai.verdict === "add_variant" ? ai.parent_slug ?? null : null);
      setMode("create");
    } else if (ai.member_reason) {
      setNote(ai.member_reason);
      setMode("dismiss");
    }
  }

  const nameOf = (slug: string | null | undefined) =>
    (slug && (library.find((x) => x.slug === slug)?.common_name ?? ai?.matches.find((m) => m.slug === slug)?.common_name)) ||
    slug ||
    "that fish";

  // Alias choices: the name matches plus any fish the AI pointed to.
  const aliasChoices = useMemo(() => {
    const seen = new Set<string>();
    return [...(ai?.matches ?? []), ...s.matches].filter((m) => (seen.has(m.slug) ? false : (seen.add(m.slug), true)));
  }, [ai, s.matches]);

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
    if (action === "dismiss" && !note.trim()) {
      setError("Pick or write a reason. The member sees it.");
      return;
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
          parentSlug: action === "create" ? parentSlug : null,
          note: note.trim() || null,
          thanks: action === "dismiss" ? thanks : undefined,
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

  // A box the AI left empty is outlined, with its reason, so nothing is missed by accident.
  const blankWhy = (k: string) =>
    !f[k]?.trim() && ai?.blank_reasons ? (ai.blank_reasons as Record<string, string | undefined>)[k] ?? null : null;
  const boxClass = (k: string) => (blankWhy(k) ? `${input} border-amber-400/70` : input);
  const why = (k: string) => {
    const w = blankWhy(k);
    return w ? <p className="mt-1 text-[11px] leading-snug text-amber-200/90">Left blank: {w}</p> : null;
  };

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
        className={boxClass(k)}
      />
      {why(k)}
    </div>
  );
  const select = (k: keyof typeof OPTIONS | "group_name", text: string, values: readonly string[]) => (
    <div>
      <label className={label} htmlFor={`${s.id}-${k}`}>
        {text}
      </label>
      <select id={`${s.id}-${k}`} value={f[k]} onChange={(e) => set(k, e.target.value)} className={boxClass(k)}>
        {["group_name", "breeding_type", "fin_nipper", "plant_safe"].includes(k) ? <option value="">Choose…</option> : null}
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      {why(k)}
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

      <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-200">
            <Sparkles className="h-3.5 w-3.5" /> AI check
          </p>
          {!aiBusy && (
            <button
              type="button"
              onClick={() => runAi(true)}
              className="inline-flex items-center gap-1 text-xs text-ocean-400 hover:text-white"
            >
              <RefreshCw className="h-3 w-3" /> Re-check
            </button>
          )}
        </div>
        {aiBusy ? (
          <p className="inline-flex items-center gap-2 text-sm text-ocean-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking it against the whole species library…
          </p>
        ) : aiError ? (
          <p className="text-sm text-coral-300">{aiError}</p>
        ) : ai ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${VERDICT_LABEL[ai.verdict].tone}`}>
                {VERDICT_LABEL[ai.verdict].text}
              </span>
              <span className="text-xs text-ocean-500">{ai.confidence} confidence</span>
              {(ai.identified_as.common_name || ai.identified_as.scientific_name) && (
                <span className="text-xs text-ocean-300">
                  Means: {ai.identified_as.common_name}
                  {ai.identified_as.scientific_name ? <i> ({ai.identified_as.scientific_name})</i> : null}
                </span>
              )}
            </div>
            <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-[15px] font-medium text-white">
              <span className="text-violet-200">Recommendation: </span>
              {recommendationText(ai, nameOf)}
            </p>
            {ai.summary && <p className="text-ocean-300">{ai.summary}</p>}
            {ai.matches.length > 0 && (
              <ul className="space-y-0.5 text-xs text-ocean-300">
                {ai.matches.map((m) => (
                  <li key={m.slug}>
                    <a href={`/species/${m.slug}`} target="_blank" className="text-emerald-300 hover:underline">
                      {m.common_name}
                    </a>{" "}
                    <span className="text-ocean-500">({m.relation})</span>
                    {m.why ? ` ${m.why}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {ai.member_reason && (
              <p className="text-xs text-ocean-400">
                If you turn it down, they see: <span className="text-ocean-200">{ai.member_reason}</span>
              </p>
            )}
            {ai.checked_twice && (
              <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100/90">
                <p className="font-semibold text-emerald-200">Checked twice</p>
                {ai.corrections?.length ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {ai.corrections.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5">A second, separate check went over every value and found nothing to change.</p>
                )}
                {Object.keys(ai.blank_reasons ?? {}).length > 0 && (
                  <p className="mt-1 text-amber-200/90">
                    Left blank on purpose: {Object.keys(ai.blank_reasons ?? {}).map((k) => k.replace(/_/g, " ")).join(", ")}. They&apos;re
                    outlined in the form.
                  </p>
                )}
              </div>
            )}
            {ai.double_check.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-200/90">
                {ai.double_check.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
            {ai.verdict !== "unsure" && (
              <button
                type="button"
                onClick={applySuggestion}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-violet-500/80 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-500"
              >
                <Sparkles className="h-4 w-4" /> {actionLabel(ai, nameOf)}
              </button>
            )}
            <p className="text-[11px] text-ocean-600">
              This opens the form below, filled in. Check it, then press the green Save button at the bottom. Cost about {ai.cost_cents.toFixed(1)}¢.
            </p>
          </div>
        ) : null}
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
            onClick={() => {
              // Every button starts from what the AI already worked out, ready to check or edit.
              if (m === "dismiss" && mode !== "dismiss" && !note.trim() && ai?.member_reason) setNote(ai.member_reason);
              if (m === "alias" && mode !== "alias" && ai?.alias_slug) setAliasSlug(ai.alias_slug);
              if (m === "create" && mode !== "create" && !prefilled && ai?.species) {
                setF((cur) => ({ ...cur, ...(ai.species ?? {}) }));
                if (ai.verdict === "add_variant" && ai.parent_slug) setParentSlug(ai.parent_slug);
                setPrefilled(true);
              }
              if (mode !== m) setScrollToForm((n) => n + 1);
              setMode(mode === m ? "none" : m);
            }}
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
        <div ref={formRef} className="mt-4 scroll-mt-24 space-y-3 rounded-xl border border-emerald-400/30 bg-white/[0.03] p-4">
          {parentSlug && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Adding as a variant of {nameOf(parentSlug)}. It gets its own page under that fish and keeps the same care
              numbers when they change.
              <button type="button" onClick={() => setParentSlug(null)} className="text-xs text-ocean-300 underline hover:text-white">
                Add as its own species instead
              </button>
            </p>
          )}
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
            {select("fin_nipper", "Nips fins?", OPTIONS.fin_nipper)}
            {select("plant_safe", "Plant safe?", OPTIONS.plant_safe)}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {field("family", "Family")}
            {field("lifespan", "Lifespan", { placeholder: "e.g. 5-8 years" })}
            {field("origin", "Origin")}
          </div>
          <div>
            <label className={label}>Summary (one line)</label>
            <input value={f.summary} maxLength={140} onChange={(e) => set("summary", e.target.value)} className={boxClass("summary")} />
            {why("summary")}
          </div>
          <div>
            <label className={label}>Care notes (2-3 sentences)</label>
            <textarea value={f.body} rows={3} onChange={(e) => set("body", e.target.value)} className={boxClass("body")} />
            {why("body")}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => send("create")}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {parentSlug ? `Save variant of ${nameOf(parentSlug)} and reward` : "Save to library and reward"}
          </button>
        </div>
      )}

      {mode === "alias" && (
        <div ref={formRef} className="mt-4 scroll-mt-24 space-y-3 rounded-xl border border-emerald-400/30 bg-white/[0.03] p-4">
          <p className="text-sm text-ocean-200">
            “{s.common_name}” gets added as another name, so people searching it find the right fish.
          </p>
          <div className="flex flex-wrap gap-2">
            {aliasChoices.map((m) => (
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
        <div ref={formRef} className="mt-4 scroll-mt-24 space-y-3 rounded-xl border border-emerald-400/30 bg-white/[0.03] p-4">
          <div className="flex flex-wrap gap-1.5">
            {ai?.member_reason && (
              <button
                type="button"
                onClick={() => setNote(ai.member_reason ?? "")}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  note === ai.member_reason
                    ? "border-violet-400/60 bg-violet-500/15 text-violet-200"
                    : "border-violet-400/30 text-violet-200/80 hover:text-white"
                }`}
              >
                <Sparkles className="h-3 w-3" /> AI&apos;s reason
              </button>
            )}
            {DISMISS_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNote(r)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  note === r
                    ? "border-coral-400/60 bg-coral-500/15 text-coral-200"
                    : "border-white/10 text-ocean-300 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Reason the member will see (required)"
            className={input}
          />
          <label className="flex items-center gap-2 text-xs text-ocean-300">
            <input
              type="checkbox"
              checked={thanks}
              onChange={(e) => setThanks(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
            Thank them with {THANKS_BUBBLES} bubbles (untick for spam)
          </label>
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
