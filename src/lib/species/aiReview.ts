import "server-only";
import { callClaude, costCents, finalText } from "@/lib/ops/claude";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OPS_MODELS } from "@/lib/ops/config";
import { findCandidates, libraryText, type LibraryEntry } from "@/lib/species/library";
import { SPECIES_FIELDS, SPECIES_OPTIONS, type AiReview, type AiVerdict, type CheckStep, type SpeciesField } from "@/lib/species/fields";
import { binomial, lookupTaxonomy, taxonomyFacts, taxonomyNames, type Taxonomy } from "@/lib/species/taxonomy";

/**
 * Checks one species request against the whole library and says what to do
 * with it, in steps, each logged so Chris can see what happened:
 *
 * 1. Library name match (free): a name we already have needs no AI at all.
 * 2. Name lookup (free): GBIF and WoRMS say if it's a real species, its
 *    current and older scientific names, and fresh vs salt water.
 * 3. Quick sort (fast model): sorts out names, groups and turn-downs.
 * 4. Careful check (careful model): only when the quick sort isn't sure or
 *    something would be added. It uses the name lookup instead of searching
 *    the web, and searches only when the lookup failed.
 * 5. Duplicate guard (free): never "add new" for a fish we have under any
 *    scientific name.
 * 6. Care data check (careful model, searches the web): fact-checks the form
 *    for anything that would be added. Retried once if it breaks.
 *
 * Any step that breaks is logged and the next one covers for it. It never
 * acts on its own; the admin still presses the button.
 */

const VERDICTS: AiVerdict[] = ["already_listed", "another_name", "too_broad", "add_variant", "add_new", "turn_down", "unsure"];

function systemPrompt(library: LibraryEntry[], groups: string[], lessons: string): string {
  const opts = Object.entries(SPECIES_OPTIONS)
    .map(([k, v]) => `- ${k}: ${v.join(", ")}`)
    .join("\n");
  return `You review species requests for Underground Aquarium, a freshwater aquarium hobby site. Members ask for a
fish, shrimp, snail, crayfish, crab or other freshwater invertebrate that they think is missing from the species library. Your job is to work out
exactly what they meant and whether the library already covers it. When you can search the web, look up any species you aren't certain of (scientific name, care data, whether
it's kept in aquariums) before deciding. Be careful and precise: a wrong "add new"
creates a duplicate page, and a wrong "already listed" turns away a real gap.

## What the library covers
Freshwater aquarium animals (fish, shrimp, snails, crayfish, crabs), with a few brackish species, plus other aquatic
invertebrates that hobbyists keep on purpose in their own tanks: scuds (amphipods), aquatic isopods (water lice),
triops and freshwater clams. Those go in the "Other Invertebrates" group; crabs go in "Crabs". Don't turn these down
as "live food": many keepers run invert-only tanks for them. No saltwater fish or corals, no plants, no pond-only
or non-aquarium animals, no land animals (land isopods like Armadillidium and Porcellio are terrarium animals), no
pest organisms (planaria, hydra) and no pure feeder cultures (daphnia, moina, microworms).

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
fin_nipper: "Yes" if it is known to nip long-finned tankmates. plant_safe: "No" if it eats or uproots live plants.
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
${libraryText(library)}${
    lessons
      ? `

## Lessons from Chris's past decisions
Times Chris chose something different from what this checker recommended. Follow the same reasoning for similar requests.
${lessons}`
      : ""
  }`;
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

/** A turn-down reply must never promise the fish will be added. */
function safeReason(reason: string | null, verdict: AiVerdict): string | null {
  if (reason && /we'?ll add|we will add|will be added|adding it soon/i.test(reason)) {
    return verdict === "add_new" || verdict === "add_variant"
      ? "Thanks for the suggestion. We're not adding it right now, but we've noted the request."
      : null;
  }
  return reason;
}

/** Keep only values the form accepts; anything odd is dropped, never guessed. */
function cleanSpecies(raw: unknown, groups: string[]): AiReview["species"] {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<Record<SpeciesField, string>> = {};
  const numeric = new Set(["temp_min_f", "temp_max_f", "ph_min", "ph_max", "gh_min", "gh_max", "max_size_in", "min_tank_gal", "min_group_size"]);
  for (const k of SPECIES_FIELDS) {
    let v = r[k];
    if (v === null || v === undefined || v === "") continue;
    // Yes/No fields come from the database as true/false.
    if (typeof v === "boolean") v = v ? "Yes" : "No";
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

/**
 * The second check: a separate, careful pass that fact-checks every value on
 * the care form and the text, fixes what's wrong, fills what it's sure of and
 * says why anything is left blank. Chris wants it right, period.
 */
async function verifySpecies(
  request: { common_name: string; scientific_name: string | null; note: string | null },
  species: NonNullable<AiReview["species"]>,
  groups: string[],
  parentName: string | null
): Promise<{ species: NonNullable<AiReview["species"]>; corrections: string[]; blanks: Partial<Record<SpeciesField, string>>; cents: number }> {
  const opts = Object.entries(SPECIES_OPTIONS)
    .map(([k, v]) => `- ${k}: ${v.join(", ")}`)
    .join("\n");
  const system = `You fact-check species care data for Underground Aquarium, a freshwater aquarium site that wants to be the
most trusted source of fishkeeping data. A first pass filled in the care form below. Search the web for this species (specialist keepers, retailers'
care sheets, scientific sources) and check every value and every
claim in summary and body against well established hobby knowledge for this exact species${parentName ? ` (a color or fin form of the ${parentName}; its care values come from the parent, so focus on the name, summary and body)` : ""}.

- Correct anything wrong, overstated or unsafe. Ranges should sit on the safer side of what hobby sources give.
- Remove any claim in summary or body you can't confirm (for example a habitat need that isn't true of this species).
- If the form is empty or nearly empty, fill it in completely from what you know.
- Fill a blank field only if you are confident. Leave it blank otherwise, and say why in "blank".
- No em dashes. Keep summary under 140 characters and body to 2 or 3 plain sentences.
- group_name must be one of: ${groups.join(", ")}
- Choice fields must use these exact values:
${opts}

Reply with ONLY a JSON object:
{"species": {every field, corrected}, "corrections": ["field: old -> new, because ...", ...],
 "blank": {"field": "why it's left blank", ...}}`;
  const reply = await callClaude({
    model: OPS_MODELS.smart,
    system,
    tools: [],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Request: ${request.common_name}${request.scientific_name ? ` (${request.scientific_name})` : ""}\nMember's note: ${request.note?.trim() || "(none)"}\n\nCare form from the first pass:\n${JSON.stringify(species, null, 1)}`,
          },
        ],
      },
    ],
    maxTokens: 3000,
    timeoutMs: 110_000,
    webSearch: 4,
  });
  const raw = parseJson(finalText(reply.content));
  const cents = costCents(OPS_MODELS.smart, reply.usage) + (reply.webSearches ?? 0);
  const checked = cleanSpecies(raw?.species, groups);
  // Anything the checker dropped by mistake falls back to the first pass, except fields it says to leave blank.
  const blanks: Partial<Record<SpeciesField, string>> = {};
  for (const [k, v] of Object.entries((raw?.blank ?? {}) as Record<string, unknown>)) {
    if ((SPECIES_FIELDS as readonly string[]).includes(k) && typeof v === "string") blanks[k as SpeciesField] = str(v, 200) ?? "";
  }
  const merged = { ...species, ...(checked ?? {}) };
  for (const k of Object.keys(blanks) as SpeciesField[]) if (!checked?.[k]) delete merged[k];
  const corrections = (Array.isArray(raw?.corrections) ? raw!.corrections : [])
    .map((x) => str(x, 240))
    .filter((x): x is string => !!x)
    .slice(0, 10);
  return { species: merged, corrections, blanks, cents };
}

const norm = (v: string | null | undefined) =>
  (v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Every name a library entry goes by, normalized. */
function namesOf(e: LibraryEntry): Set<string> {
  return new Set(
    [e.common_name, e.scientific_name, ...(e.also_known_as ?? []), ...(e.former_names ?? []), ...(e.trade_codes ?? [])]
      .map(norm)
      .filter(Boolean)
  );
}

/**
 * The one library entry whose names include exactly what the member typed, or
 * null. Only a clean, single, non-conflicting hit counts; anything fuzzy goes
 * to the AI.
 */
function exactLibraryMatch(library: LibraryEntry[], request: { common_name: string; scientific_name: string | null }): LibraryEntry | null {
  const typed = norm(request.common_name);
  if (typed.length < 3) return null;
  const hits = library.filter((e) => namesOf(e).has(typed));
  if (hits.length !== 1) return null;
  const hit = hits[0];
  // A scientific name that points somewhere else means it isn't that simple.
  const typedSci = binomial(request.scientific_name);
  if (typedSci && binomial(hit.scientific_name) && typedSci !== binomial(hit.scientific_name)) return null;
  return hit;
}

/** The base library species with any of these scientific names (a variant points to its parent). */
function libraryByScientific(library: LibraryEntry[], names: Set<string>): LibraryEntry | null {
  if (names.size === 0) return null;
  const bySlug = new Map(library.map((e) => [e.slug, e]));
  const hit = library.find((e) => {
    const b = binomial(e.scientific_name);
    return b && names.has(b);
  });
  if (!hit) return null;
  return hit.parent_slug && bySlug.has(hit.parent_slug) ? bySlug.get(hit.parent_slug)! : hit;
}

const VERDICT_WORDS: Record<string, string> = {
  already_listed: "already in the library",
  another_name: "another name for a fish we have",
  too_broad: "too broad (a group, not one species)",
  add_variant: "a new variant",
  add_new: "a new species to add",
  turn_down: "turn it down",
  unsure: "not sure",
};

/** A whole check costs at most this long; Vercel stops the function at 300 seconds. */
const BUDGET_MS = 270_000;

export async function reviewSpeciesRequest(
  request: { common_name: string; scientific_name: string | null; note: string | null },
  library: LibraryEntry[],
  lessons = ""
): Promise<AiReview> {
  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);
  const steps: CheckStep[] = [];
  const log = (s: CheckStep) => steps.push({ ...s, cents: s.cents !== undefined ? Math.round(s.cents * 10) / 10 : undefined });
  const timed = async <T,>(fn: () => Promise<T>) => {
    const t = Date.now();
    const value = await fn();
    return { value, ms: Date.now() - t };
  };

  const groups = [...new Set(library.map((e) => e.group_name).filter((g): g is string => !!g))].sort();
  const bySlug = new Map(library.map((e) => [e.slug, e]));
  let cents = 0;

  // ---- Step 1: library name match (free) ----
  try {
    const hit = exactLibraryMatch(library, request);
    if (hit) {
      log({
        key: "exact",
        label: "Library name match",
        status: "done",
        note: `"${request.common_name}" is already a name for ${hit.common_name}, so no AI was needed.`,
        cents: 0,
      });
      return {
        verdict: "already_listed",
        confidence: "high",
        identified_as: { common_name: hit.common_name, scientific_name: hit.scientific_name },
        summary: `"${request.common_name}" is already in the library as ${hit.common_name}${hit.scientific_name ? ` (${hit.scientific_name})` : ""}.`,
        recommendation: `Turn it down kindly: it's already in the library as ${hit.common_name}.`,
        matches: [{ slug: hit.slug, common_name: hit.common_name, relation: "same species", why: "Exact name match." }],
        alias_slug: null,
        parent_slug: null,
        member_reason: `Good news: it's already in the library as ${hit.common_name}. Search for it on the species list.`,
        species: null,
        double_check: [],
        model: "none",
        cost_cents: 0,
        checked_at: new Date().toISOString(),
        steps,
      };
    }
    log({ key: "exact", label: "Library name match", status: "done", note: "No exact name match, so it goes to the next steps.", cents: 0 });
  } catch {
    log({ key: "exact", label: "Library name match", status: "failed", note: "Couldn't run. The AI checks the whole library anyway." });
  }

  // ---- Step 2: name lookup (free). Runs now if they typed a scientific name, else after the quick sort names it. ----
  let tax: Taxonomy | null = null;
  let lookedUp: string | null = null;
  async function nameLookup(name: string, why: string) {
    lookedUp = name;
    try {
      const { value, ms } = await timed(() => lookupTaxonomy(name));
      tax = value;
      const g = value.gbif;
      const bits = [
        value.sources.gbif === "found" && g
          ? g.matchType === "HIGHERRANK"
            ? `GBIF only knows ${g.matched} as a ${g.rank?.toLowerCase() ?? "group"}, not one species`
            : `GBIF: ${g.matched}${g.accepted && g.accepted !== g.matched ? `, now called ${g.accepted}` : ""}${g.synonyms.length ? `, ${g.synonyms.length} older names` : ""}`
          : `GBIF ${value.sources.gbif === "failed" ? "couldn't be reached" : "has no match"}`,
        value.sources.worms === "found" && value.habitat
          ? `WoRMS: ${[value.habitat.freshwater && "fresh", value.habitat.brackish && "brackish", value.habitat.marine && "marine"].filter(Boolean).join(", ") || "habitat not stated"}`
          : `WoRMS ${value.sources.worms === "failed" ? "couldn't be reached" : "doesn't list it"}`,
      ];
      log({ key: "lookup", label: "Name lookup (GBIF and WoRMS)", status: "done", note: `Looked up ${name} (${why}). ${bits.join(". ")}.`, cents: 0, ms });
    } catch {
      log({
        key: "lookup",
        label: "Name lookup (GBIF and WoRMS)",
        status: "failed",
        note: "Neither database could be reached. The careful check will search the web instead.",
      });
    }
  }
  if (request.scientific_name?.trim()) await nameLookup(request.scientific_name.trim(), "the scientific name they typed");

  const candidates = findCandidates(library, request, 15);
  const system = systemPrompt(library, groups, lessons);
  const userText = (facts: string | null) => `Species request from a member:
Common name they typed: ${request.common_name}
Scientific name they typed: ${request.scientific_name || "(none)"}
Their note: ${request.note?.trim() || "(none)"}

A name search of the library found these possible matches (may be incomplete or wrong; check the full library):
${candidates.length ? candidates.map((c) => `- ${c.entry.slug} (${c.entry.common_name}): matched on ${c.why}`).join("\n") : "- nothing"}
${facts ? `\n${facts}\nTrust these database facts over memory for names and habitat.\n` : ""}
Decide, then answer with the JSON object only.`;

  async function ask(model: (typeof OPS_MODELS)[keyof typeof OPS_MODELS], webSearch: number, facts: string | null) {
    const reply = await callClaude({
      model,
      system,
      tools: [],
      messages: [{ role: "user", content: [{ type: "text", text: userText(facts) }] }],
      maxTokens: 3000,
      timeoutMs: Math.min(model === OPS_MODELS.smart ? 110_000 : 55_000, Math.max(20_000, left() - 30_000)),
      webSearch: webSearch || undefined,
    });
    const raw = parseJson(finalText(reply.content));
    const c = costCents(model, reply.usage) + (reply.webSearches ?? 0);
    if (!raw) throw Object.assign(new Error("The answer couldn't be read."), { cents: c });
    return { raw, cents: c, searches: reply.webSearches ?? 0 };
  }

  // ---- Step 3: quick sort (fast model) ----
  let quick: Record<string, unknown> | null = null;
  try {
    const { value, ms } = await timed(() => ask(OPS_MODELS.fast, 0, tax ? taxonomyFacts(tax) : null));
    quick = value.raw;
    cents += value.cents;
    log({
      key: "quick",
      label: "Quick sort (fast AI)",
      status: "done",
      note: `Said: ${VERDICT_WORDS[String(quick.verdict)] ?? String(quick.verdict)}, ${String(quick.confidence ?? "medium")} confidence.`,
      cents: value.cents,
      ms,
    });
  } catch (e) {
    const c = (e as { cents?: number }).cents ?? 0;
    cents += c;
    log({ key: "quick", label: "Quick sort (fast AI)", status: "failed", note: "Didn't finish. The careful AI steps in.", cents: c });
  }

  // The name lookup, now that the quick sort has named the fish.
  const identified = str((quick?.identified_as as Record<string, unknown> | undefined)?.scientific_name, 120);
  if (!lookedUp && identified) await nameLookup(identified, "the scientific name the quick sort identified");
  else if (!lookedUp) log({ key: "lookup", label: "Name lookup (GBIF and WoRMS)", status: "skipped", note: "No scientific name to look up yet." });

  // ---- Step 4: careful check, only when needed ----
  let raw: Record<string, unknown> | null = quick;
  let model: string = OPS_MODELS.fast;
  const doubleCheck: string[] = [];
  const unsettled =
    !quick ||
    quick.verdict === "unsure" ||
    quick.confidence === "low" ||
    quick.verdict === "add_new" ||
    quick.verdict === "add_variant";
  const t = tax as Taxonomy | null;
  // Free early look: if the quick sort wants to add a fish we already have under
  // one of its scientific names, the duplicate guard below settles it, so the
  // careful check would be money spent for nothing.
  let earlyDup: LibraryEntry | null = null;
  try {
    if (quick?.verdict === "add_new") {
      earlyDup = libraryByScientific(
        library,
        taxonomyNames(t, request.scientific_name, identified, str((quick.identified_as as Record<string, unknown> | undefined)?.scientific_name, 120))
      );
    }
  } catch {
    earlyDup = null;
  }
  if (earlyDup) {
    log({
      key: "careful",
      label: "Careful check (careful AI)",
      status: "skipped",
      note: `Not needed: ${earlyDup.common_name} is already in the library with the same scientific name.`,
    });
  } else if (!unsettled) {
    log({ key: "careful", label: "Careful check (careful AI)", status: "skipped", note: "The quick sort was confident and nothing would be added, so it wasn't needed." });
  } else if (left() < 60_000) {
    log({ key: "careful", label: "Careful check (careful AI)", status: "skipped", note: "Out of time. Press Check again." });
    doubleCheck.push("The careful check ran out of time. Press Check again before acting on this.");
  } else {
    // The lookup replaces the web search; search only when it couldn't help.
    const lookupHelped = Boolean(t?.gbif);
    const searches = lookupHelped ? 0 : 4;
    const why = !quick ? "the quick sort failed" : `the quick sort said ${VERDICT_WORDS[String(quick.verdict)] ?? quick.verdict}${quick.confidence === "low" ? " with low confidence" : ""}`;
    try {
      const { value, ms } = await timed(() => ask(OPS_MODELS.smart, searches, t ? taxonomyFacts(t) : null));
      raw = value.raw;
      model = OPS_MODELS.smart;
      cents += value.cents;
      log({
        key: "careful",
        label: "Careful check (careful AI)",
        status: quick ? "done" : "stepped_in",
        note: `Ran because ${why}. Said: ${VERDICT_WORDS[String(raw.verdict)] ?? String(raw.verdict)}, ${String(raw.confidence ?? "medium")} confidence. ${
          lookupHelped ? "Used the name lookup instead of searching the web." : `Searched the web ${value.searches} time${value.searches === 1 ? "" : "s"} because the name lookup couldn't help.`
        }`,
        cents: value.cents,
        ms,
      });
    } catch (e) {
      const c = (e as { cents?: number }).cents ?? 0;
      cents += c;
      if (quick) {
        log({
          key: "careful",
          label: "Careful check (careful AI)",
          status: "failed",
          note: "Didn't finish. Using the quick sort's answer instead, marked low confidence.",
          cents: c,
        });
        doubleCheck.push("The careful check didn't finish, so this is the quick sort's answer. Press Check again before adding anything.");
      } else {
        log({ key: "careful", label: "Careful check (careful AI)", status: "failed", note: "Didn't finish either.", cents: c });
      }
    }
  }

  // Both AIs failed: say so plainly instead of guessing, with the log of what happened.
  if (!raw) {
    return {
      verdict: "unsure",
      confidence: "low",
      identified_as: { common_name: null, scientific_name: null },
      summary: "The checker couldn't finish. See what it did below.",
      recommendation: "The checker couldn't finish. Press Check again, or decide it yourself.",
      matches: [],
      alias_slug: null,
      parent_slug: null,
      member_reason: null,
      species: null,
      double_check: doubleCheck,
      model: "none",
      cost_cents: Math.round(cents * 10) / 10,
      checked_at: new Date().toISOString(),
      steps,
    };
  }

  const verdict = VERDICTS.includes(raw.verdict as AiVerdict) ? (raw.verdict as AiVerdict) : "unsure";
  let matches = (Array.isArray(raw.matches) ? raw.matches : [])
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
  doubleCheck.push(
    ...(Array.isArray(raw.double_check) ? raw.double_check : [])
      .map((x) => str(x, 240))
      .filter((x): x is string => !!x)
      .slice(0, 6)
  );

  // A name or variant needs a real fish to attach to. Fall back to the match the AI
  // itself called the same species before giving up.
  let aliasSlug = verdict === "another_name" ? validSlug(raw.alias_slug) ?? sameSpecies : validSlug(raw.alias_slug);
  let parentSlug = verdict === "add_variant" ? validSlug(raw.parent_slug) ?? sameSpecies : null;
  // Point at the base species, not at another variant of it.
  if (parentSlug && bySlug.get(parentSlug)?.parent_slug && bySlug.has(bySlug.get(parentSlug)!.parent_slug!)) {
    parentSlug = bySlug.get(parentSlug)!.parent_slug!;
  }
  let finalVerdict: AiVerdict = verdict;
  let confidence: AiReview["confidence"] = raw.confidence === "high" || raw.confidence === "low" ? raw.confidence : "medium";
  if (model === OPS_MODELS.fast && unsettled) confidence = "low";
  let recommendation = str(raw.recommendation, 300);
  let summary = str(raw.summary, 900) ?? "";
  let memberReason = safeReason(str(raw.member_reason, 300), verdict);
  if ((verdict === "another_name" && !aliasSlug) || (verdict === "add_variant" && !parentSlug)) {
    finalVerdict = "unsure";
    confidence = "low";
    recommendation = "Check it yourself: the AI couldn't point to the fish in the library this belongs to.";
  }

  // ---- Step 5: duplicate guard (free) ----
  try {
    const names = taxonomyNames(t, request.scientific_name, identified, str(id.scientific_name, 120));
    const dup = finalVerdict === "add_new" ? libraryByScientific(library, names) : null;
    if (dup) {
      const typedIsKnown = namesOf(dup).has(norm(request.common_name));
      finalVerdict = typedIsKnown ? "already_listed" : "another_name";
      aliasSlug = typedIsKnown ? null : dup.slug;
      confidence = "high";
      recommendation = typedIsKnown
        ? `Turn it down kindly: it's already in the library as ${dup.common_name}.`
        : `Add "${request.common_name}" as another name for ${dup.common_name}.`;
      memberReason = typedIsKnown ? `Good news: it's already in the library as ${dup.common_name}.` : memberReason;
      summary = `${summary} The duplicate guard found ${dup.common_name} already in the library with the same scientific name${
        dup.scientific_name ? ` (${dup.scientific_name})` : ""
      }, so it shouldn't get a second page.`.trim();
      if (!matches.some((m) => m.slug === dup.slug)) {
        matches = [{ slug: dup.slug, common_name: dup.common_name, relation: "same species", why: "Same scientific name." }, ...matches].slice(0, 5);
      }
      log({
        key: "duplicate",
        label: "Duplicate guard",
        status: "stepped_in",
        note: `The AI said add new, but ${dup.common_name} has the same scientific name. Changed to ${VERDICT_WORDS[finalVerdict]}.`,
        cents: 0,
      });
    } else {
      log({
        key: "duplicate",
        label: "Duplicate guard",
        status: finalVerdict === "add_new" ? "done" : "skipped",
        note:
          finalVerdict === "add_new"
            ? `No fish in the library has any of its scientific names (${names.size} checked).`
            : finalVerdict === "add_variant"
              ? "A variant shares its parent's scientific name, so this check doesn't apply."
              : "Nothing would be added, so there was nothing to guard.",
        cents: 0,
      });
    }
  } catch {
    log({ key: "duplicate", label: "Duplicate guard", status: "failed", note: "Couldn't run. Check the similar fish listed above before adding." });
    if (finalVerdict === "add_new") doubleCheck.push("The duplicate guard didn't run. Make sure none of the similar fish is the same species.");
  }

  // Facts from the databases that the admin should see, whatever the AI said.
  if (t?.habitat?.marine && !t.habitat.freshwater && !t.habitat.brackish && (finalVerdict === "add_new" || finalVerdict === "add_variant")) {
    doubleCheck.unshift("WoRMS lists this as a saltwater species. The library is freshwater and brackish only.");
  }
  if (t?.gbif?.matchType === "HIGHERRANK" && finalVerdict === "add_new") {
    doubleCheck.unshift(`GBIF only knows ${t.gbif.matched} as a ${t.gbif.rank?.toLowerCase() ?? "group"}, not one species. Check the exact species.`);
  }
  if (t && !t.gbif && t.sources.gbif === "not found" && finalVerdict === "add_new") {
    doubleCheck.push("GBIF has no species by this scientific name. Check the spelling before adding.");
  }

  // A variant starts from its parent's care page; the AI only writes what's different.
  let species: AiReview["species"] = null;
  if (finalVerdict === "add_new") species = cleanSpecies(raw.species, groups) ?? {};
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

  // ---- Step 6: care data check (careful AI, searches the web), retried once if it breaks ----
  let corrections: string[] = [];
  let blanks: Partial<Record<SpeciesField, string>> = {};
  let checkedTwice = false;
  if (species && (finalVerdict === "add_new" || finalVerdict === "add_variant")) {
    const parentName = finalVerdict === "add_variant" && parentSlug ? bySlug.get(parentSlug)?.common_name ?? null : null;
    for (let attempt = 1; attempt <= 2 && !checkedTwice; attempt++) {
      if (left() < 70_000) {
        log({ key: "verify", label: "Care data check (careful AI)", status: "skipped", note: "Out of time. Press Check again before adding it." });
        doubleCheck.unshift("The care data check didn't run. Press Check again before adding it.");
        break;
      }
      try {
        const { value: v, ms } = await timed(() => verifySpecies(request, species!, groups, parentName));
        species = v.species;
        corrections = v.corrections;
        blanks = v.blanks;
        cents += v.cents;
        checkedTwice = true;
        log({
          key: "verify",
          label: "Care data check (careful AI)",
          status: attempt === 1 ? "done" : "stepped_in",
          note: `${attempt === 2 ? "Second try worked. " : ""}Checked every value against hobby sources on the web. ${
            v.corrections.length ? `Fixed ${v.corrections.length} value${v.corrections.length === 1 ? "" : "s"}.` : "Nothing needed fixing."
          }${Object.keys(v.blanks).length ? ` Left ${Object.keys(v.blanks).length} blank on purpose.` : ""}`,
          cents: v.cents,
          ms,
        });
      } catch {
        log({
          key: "verify",
          label: "Care data check (careful AI)",
          status: "failed",
          note: attempt === 1 ? "Didn't finish. Trying once more." : "Didn't finish on the second try either.",
        });
        if (attempt === 2) doubleCheck.unshift("The care data check didn't finish. Press Check again before adding it.");
      }
    }
  } else {
    log({ key: "verify", label: "Care data check (careful AI)", status: "skipped", note: "Nothing would be added, so there was no care form to check." });
  }

  // Every field the form needs, with a reason when it's still empty.
  if (species) {
    for (const k of SPECIES_FIELDS) {
      if (!species[k] && !blanks[k] && !["common_name", "scientific_name", "min_group_size"].includes(k)) {
        blanks[k] = "Not filled in by either check.";
      }
    }
  }

  return {
    checked_twice: checkedTwice,
    corrections,
    blank_reasons: blanks,
    verdict: finalVerdict,
    confidence,
    identified_as: { common_name: str(id.common_name, 120), scientific_name: str(id.scientific_name, 120) },
    summary,
    recommendation,
    matches,
    alias_slug: aliasSlug,
    parent_slug: finalVerdict === "add_variant" ? parentSlug : null,
    member_reason: memberReason,
    species: finalVerdict === "add_new" || finalVerdict === "add_variant" ? species : null,
    double_check: doubleCheck.slice(0, 8),
    model,
    cost_cents: Math.round(cents * 10) / 10,
    checked_at: new Date().toISOString(),
    steps,
  };
}
