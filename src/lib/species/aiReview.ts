import "server-only";
import { callClaude, costCents } from "@/lib/ops/claude";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OPS_MODELS } from "@/lib/ops/config";
import { findCandidates, libraryText, type LibraryEntry } from "@/lib/species/library";
import { SPECIES_FIELDS, SPECIES_OPTIONS, type AiReview, type AiVerdict, type SpeciesField } from "@/lib/species/fields";

/**
 * Checks one species request against the whole library and says what to do
 * with it. The fast model goes first; when it isn't sure (verdict "unsure"
 * or low confidence) the careful model takes a second look, so the hard
 * cases still get the best answer and the easy ones cost about a third. It
 * never acts on its own; the admin still presses the button.
 */

const VERDICTS: AiVerdict[] = ["already_listed", "another_name", "too_broad", "add_variant", "add_new", "turn_down", "unsure"];

function systemPrompt(library: LibraryEntry[], groups: string[]): string {
  const opts = Object.entries(SPECIES_OPTIONS)
    .map(([k, v]) => `- ${k}: ${v.join(", ")}`)
    .join("\n");
  return `You review species requests for Underground Aquarium, a freshwater aquarium hobby site. Members ask for a
fish, shrimp, snail or crayfish that they think is missing from the species library. Your job is to work out
exactly what they meant and whether the library already covers it. Be careful and precise: a wrong "add new"
creates a duplicate page, and a wrong "already listed" turns away a real gap.

## What the library covers
Freshwater aquarium animals (fish, shrimp, snails, crayfish), with a few brackish species. No saltwater fish or
corals, no plants, no pond-only or non-aquarium animals.

## How to decide (pick exactly one verdict)
- already_listed: the fish they mean is in the library AND the name they used is already its common name, an aka,
  a former name or a trade code. Nothing to add. Turn down kindly and point them to it.
- another_name: the fish they mean is in the library, but the name they used is a real, commonly used name for it
  that is NOT recorded yet (a common name, a misspelling people actually use, a trade name, a "former name" after a
  reclassification). Adding it as an aka helps search. Give alias_slug.
- too_broad: they named a genus, family, group or category (for example "corydora", "cory cat", "pleco", "tetra",
  "cichlid", "shrimp") rather than one species, and the library has species under it. Turn down kindly, name a few
  of the matching library species, and invite them to request the exact species if theirs isn't listed. If the
  library has an entry whose type is a group or genus page for exactly that name, use already_listed instead.
- add_variant: an established color, fin or line-bred form of a species that IS in the library (albino, gold,
  electric blue, longfin, veil or "angel" fins, balloon, and so on) that hobbyists buy and search for by that name,
  and the library doesn't list yet. It gets its own page under the parent species and copies the parent's care
  numbers. Give parent_slug (the base species, not another variant). Write species.common_name (the variant's proper
  name, in title case), species.summary and species.body describing what's different about this form; leave the care
  numbers out unless this form really differs (for example a longfin form needing gentler tankmates).
- add_new: a real freshwater or brackish aquarium species that is not in the library under any name. Fill in the care
  form.
- turn_down: saltwater, plant, made-up or unidentifiable name, not kept in aquariums, or spam.
- unsure: you can't tell with reasonable confidence. Say exactly what the admin should check.

Check spelling carefully: members misspell (corydora, pleco, cardnial tetra) and use plurals. Check the scientific
name, genus, akas, former names and trade codes (L-numbers, C-numbers), not only common names. A species that was
renamed (for example a genus change) is the same fish. Color forms and line-bred variants are not new species: if
the base species is in the library, use add_variant for an established, recognizable form, or another_name when the
name is just a different label for a form or species already listed. Never use add_new for a variant.

## Make the call
Chris wants a recommendation, not homework. Pick the verdict you would act on and say so in "recommendation": one
plain sentence that starts with what to do, for example "Add it as a variant of German Blue Ram." or "Add 'Angel
Veil Ram' as another name for German Blue Ram." or "Turn it down: it's a saltwater fish." Use unsure only when you
truly can't identify the fish, and then the recommendation says what to look up. double_check is only for specific
facts you aren't sure of (a number, a scientific name), never "decide whether to add it".

## The care form (add_new; for add_variant only the fields listed above)
group_name must be one of: ${groups.join(", ")}
Pick each choice field from its list exactly:
${opts}
Numbers: temp_min_f and temp_max_f in °F, ph_min/ph_max (one decimal), gh_min/gh_max in dGH, max_size_in in inches
(adult size, one decimal), min_tank_gal in US gallons, min_group_size (blank for solitary fish). lifespan like
"5-8 years". summary: one line, under 140 characters. body: 2 or 3 plain sentences of practical care.
Use well established hobby values. If you're not sure of a value, leave it out and say so in double_check.
Never invent a scientific name.

## Writing
member_reason: ALWAYS write it, whatever the verdict. It is what the member sees if Chris turns the request
down, so write it as that reply: one or two short, friendly, plain sentences, no em dashes, naming library fish by
their common names. Examples: "That's another name for the Panda Cory, which is already in the library." "Cory cats
are a whole group; we have 30 of them listed. Request the exact species if yours isn't there." "That's a saltwater
fish, and the library is freshwater only." For add_new and add_variant, say kindly that it isn't being added right now (never promise it will be).
summary is for the admin: two to four sentences. No em dashes anywhere.

## Answer
Keep it short: summary under 60 words, at most 5 matches, "why" under 12 words each.
Reply with ONLY a JSON object, no other text:
{"verdict": "...", "confidence": "high|medium|low",
 "identified_as": {"common_name": "...", "scientific_name": "..."},
 "summary": "...",
 "matches": [{"slug": "...", "relation": "same species|variant|same genus|same group|related", "why": "..."}],
 "recommendation": "...",
 "alias_slug": "... or null", "parent_slug": "... or null", "member_reason": "...",
 "species": {field: value, ...} or null,
 "double_check": ["..."]}
Only use slugs that appear in the library below. List at most 5 matches, most relevant first.

## The species library, by group (slug | common name | scientific name | akas | codes | notes)
${libraryText(library)}`;
}

function parseJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const str = (v: unknown, max = 600): string | null =>
  typeof v === "string" && v.trim() ? v.replace(/\s*\u2014\s*/g, ", ").trim().slice(0, max) : null;

/** Keep only values the form accepts; anything odd is dropped, never guessed. */
function cleanSpecies(raw: unknown, groups: string[]): AiReview["species"] {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<Record<SpeciesField, string>> = {};
  const numeric = new Set(["temp_min_f", "temp_max_f", "ph_min", "ph_max", "gh_min", "gh_max", "max_size_in", "min_tank_gal", "min_group_size"]);
  for (const k of SPECIES_FIELDS) {
    const v = r[k];
    if (v === null || v === undefined || v === "") continue;
    if (numeric.has(k)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n < 2000) out[k] = String(Math.round(n * 10) / 10);
      continue;
    }
    const s = str(v, k === "body" ? 800 : 200);
    if (!s) continue;
    if (k === "group_name") {
      const g = groups.find((x) => x.toLowerCase() === s.toLowerCase());
      if (g) out[k] = g;
      continue;
    }
    const allowed = (SPECIES_OPTIONS as Record<string, readonly string[]>)[k];
    if (allowed) {
      const hit = allowed.find((x) => x.toLowerCase() === s.toLowerCase());
      if (hit) out[k] = hit;
      continue;
    }
    out[k] = k === "summary" ? s.slice(0, 140) : s;
  }
  // A backwards range is a sign the numbers can't be trusted; drop the pair.
  for (const [lo, hi] of [["temp_min_f", "temp_max_f"], ["ph_min", "ph_max"], ["gh_min", "gh_max"]] as const) {
    if (out[lo] && out[hi] && Number(out[lo]) > Number(out[hi])) {
      delete out[lo];
      delete out[hi];
    }
  }
  return Object.keys(out).length ? out : null;
}

export async function reviewSpeciesRequest(
  request: { common_name: string; scientific_name: string | null; note: string | null },
  library: LibraryEntry[]
): Promise<AiReview> {
  const groups = [...new Set(library.map((e) => e.group_name).filter((g): g is string => !!g))].sort();
  const candidates = findCandidates(library, request, 15);
  const system = systemPrompt(library, groups);

  const userText = `Species request from a member:
Common name they typed: ${request.common_name}
Scientific name they typed: ${request.scientific_name || "(none)"}
Their note: ${request.note?.trim() || "(none)"}

A name search of the library found these possible matches (may be incomplete or wrong; check the full library):
${candidates.length ? candidates.map((c) => `- ${c.entry.slug} (${c.entry.common_name}): matched on ${c.why}`).join("\n") : "- nothing"}

Decide, then answer with the JSON object only.`;

  async function ask(model: (typeof OPS_MODELS)[keyof typeof OPS_MODELS]) {
    const reply = await callClaude({
      model,
      system,
      tools: [],
      messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
      maxTokens: 2000,
      timeoutMs: 55_000,
    });
    const text = reply.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return { raw: parseJson(text), cents: costCents(model, reply.usage) };
  }

  // Fast model first; the careful one only for the cases it can't settle.
  let model: (typeof OPS_MODELS)[keyof typeof OPS_MODELS] = OPS_MODELS.fast;
  let first = await ask(model).catch(() => ({ raw: null, cents: 0 }));
  let cents = first.cents;
  const unsettled = !first.raw || first.raw.verdict === "unsure" || first.raw.confidence === "low";
  if (unsettled) {
    model = OPS_MODELS.smart;
    const second = await ask(model);
    cents += second.cents;
    if (second.raw) first = second;
  }
  const raw = first.raw;
  if (!raw) throw new Error("The AI's answer couldn't be read. Try again.");

  const bySlug = new Map(library.map((e) => [e.slug, e]));
  const verdict = VERDICTS.includes(raw.verdict as AiVerdict) ? (raw.verdict as AiVerdict) : "unsure";
  const matches = (Array.isArray(raw.matches) ? raw.matches : [])
    .map((m) => m as Record<string, unknown>)
    .filter((m) => typeof m.slug === "string" && bySlug.has(m.slug))
    .slice(0, 5)
    .map((m) => ({
      slug: m.slug as string,
      common_name: bySlug.get(m.slug as string)!.common_name,
      relation: str(m.relation, 40) ?? "related",
      why: str(m.why, 200) ?? "",
    }));
  const sameSpecies = matches.find((m) => m.relation === "same species")?.slug ?? null;
  const validSlug = (v: unknown) => (typeof v === "string" && bySlug.has(v) ? v : null);
  const id = (raw.identified_as ?? {}) as Record<string, unknown>;
  const doubleCheck = (Array.isArray(raw.double_check) ? raw.double_check : [])
    .map((x) => str(x, 240))
    .filter((x): x is string => !!x)
    .slice(0, 6);

  // A name or variant needs a real fish to attach to. Fall back to the match the AI
  // itself called the same species before giving up.
  const aliasSlug = verdict === "another_name" ? validSlug(raw.alias_slug) ?? sameSpecies : validSlug(raw.alias_slug);
  let parentSlug = verdict === "add_variant" ? validSlug(raw.parent_slug) ?? sameSpecies : null;
  // Point at the base species, not at another variant of it.
  if (parentSlug && bySlug.get(parentSlug)?.parent_slug && bySlug.has(bySlug.get(parentSlug)!.parent_slug!)) {
    parentSlug = bySlug.get(parentSlug)!.parent_slug!;
  }
  let finalVerdict: AiVerdict = verdict;
  let confidence: AiReview["confidence"] = raw.confidence === "high" || raw.confidence === "low" ? raw.confidence : "medium";
  let recommendation = str(raw.recommendation, 300);
  if ((verdict === "another_name" && !aliasSlug) || (verdict === "add_variant" && !parentSlug)) {
    finalVerdict = "unsure";
    confidence = "low";
    recommendation = "Check it yourself: the AI couldn't point to the fish in the library this belongs to.";
  }

  // A variant starts from its parent's care page; the AI only writes what's different.
  let species: AiReview["species"] = null;
  if (finalVerdict === "add_new") species = cleanSpecies(raw.species, groups);
  if (finalVerdict === "add_variant" && parentSlug) {
    const { data: parent } = await supabaseAdmin.from("species").select(SPECIES_FIELDS.join(", ")).eq("slug", parentSlug).maybeSingle();
    const own = cleanSpecies(raw.species, groups) ?? {};
    const base = cleanSpecies(parent, groups) ?? {};
    // The parent's name and write-up describe the parent, not this form.
    delete base.common_name;
    delete base.summary;
    delete base.body;
    delete own.scientific_name;
    species = { ...base, ...own };
  }

  return {
    verdict: finalVerdict,
    confidence,
    identified_as: { common_name: str(id.common_name, 120), scientific_name: str(id.scientific_name, 120) },
    summary: str(raw.summary, 900) ?? "",
    recommendation,
    matches,
    alias_slug: aliasSlug,
    parent_slug: parentSlug,
    member_reason: str(raw.member_reason, 300),
    species,
    double_check: doubleCheck,
    model,
    cost_cents: Math.round(cents * 10) / 10,
    checked_at: new Date().toISOString(),
  };
}
