import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { callClaude, costCents, finalText } from "@/lib/ops/claude";
import { OPS_MODELS } from "@/lib/ops/config";
import { FACT_LABELS } from "@/lib/breeding/factLabels";

/**
 * Drafts a breeding guide for a species that doesn't have one, to the same
 * standard as the original 227: written first, then checked claim by claim
 * by a separate pass that fixes what it can and lists what it isn't sure of.
 * The draft is saved unpublished; nothing goes live until Chris says yes on
 * Admin, Breeding guides.
 */

const FACT_KEYS = FACT_LABELS.map(([k]) => k);
const ANIMAL_FACT_KEYS = FACT_KEYS.filter((k) => !["light", "co2", "substrate", "timeline", "first_steps"].includes(k));

type Draft = {
  seo_title: string;
  summary: string;
  intro: string;
  facts: Record<string, string>;
  sections: { heading: string; text: string }[];
  faq: { q: string; a: string }[];
  society_tip?: string | null;
};

const STANDARD = `You write breeding guides for Underground Aquarium, a freshwater aquarium hobby site that wants to be the
most trusted source of fishkeeping data. Every guide must be accurate, practical and plain.

Rules:
- Research first: search the web for how this species is bred (breeders' reports, specialist societies, care
  sheets, papers) before writing or checking. Base every fact on what you find, not on memory alone.
- Plain, friendly words a hobbyist understands. Short paragraphs. No em dashes anywhere. No hype.
- Be accurate above all. Where hobby sources disagree, or the species is rarely bred, say so and give a range, not a
  falsely precise number. Never invent a spawn size, hatch time or method you aren't confident of; say what is
  commonly reported and how sure that is. If it has rarely or never been bred in aquariums, the guide says that
  plainly and covers what is known and what keepers have tried.
- Safe-side advice: never recommend water outside the species' everyday care range except for a named spawning
  trigger, and say when a trigger is temporary.
- The everyday care numbers come live from the species page. When you state the everyday range, write the
  placeholder instead of the number: {{temp}}°F for temperature, pH {{ph}}, {{gh}} dGH for hardness, {{size}}
  inches for adult size, {{tank}} gallons for the minimum tank. Spawning-specific numbers (a cooler trigger, a
  warmer hatching temperature) are written as plain numbers.
- Same shape as the example: seo_title ("How to Breed X: ..." under 70 characters), summary (one or two sentences,
  under 170 characters), intro (one paragraph), facts, 6 to 8 sections, and 3 to 5 FAQ items.
- facts keys, each a short phrase: ${ANIMAL_FACT_KEYS.join(", ")}.
- Section order: setting up the breeding tank, conditioning and choosing a pair or group, spawning (what you'll
  see), eggs (or pregnancy, or carrying), raising the fry (with a week by week list), growing out, common mistakes.
  Adjust headings to fit the species (for a livebearer, "Pregnancy and Birth").`;

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

const noDash = (s: string) => s.replace(/\s*—\s*/g, ", ").replace(/–/g, " to ");
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? noDash(v.trim()).slice(0, max) : "");

/** Keep only the shape the guide page understands. */
function clean(raw: Record<string, unknown> | null): Draft | null {
  if (!raw) return null;
  const facts: Record<string, string> = {};
  const rf = (raw.facts ?? {}) as Record<string, unknown>;
  for (const k of ANIMAL_FACT_KEYS) {
    const v = str(rf[k], 300);
    if (v) facts[k] = v;
  }
  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .map((x) => x as Record<string, unknown>)
    .map((x) => ({ heading: str(x.heading, 80), text: str(x.text, 4000) }))
    .filter((x) => x.heading && x.text)
    .slice(0, 9);
  const faq = (Array.isArray(raw.faq) ? raw.faq : [])
    .map((x) => x as Record<string, unknown>)
    .map((x) => ({ q: str(x.q, 200), a: str(x.a, 600) }))
    .filter((x) => x.q && x.a)
    .slice(0, 6);
  const d: Draft = {
    seo_title: str(raw.seo_title, 90),
    summary: str(raw.summary, 220),
    intro: str(raw.intro, 1500),
    facts,
    sections,
    faq,
    society_tip: str(raw.society_tip, 400) || null,
  };
  return d.seo_title && d.summary && d.intro && d.sections.length >= 4 && facts.method ? d : null;
}

async function ask(system: string, text: string) {
  const reply = await callClaude({
    model: OPS_MODELS.smart,
    system,
    tools: [],
    messages: [{ role: "user", content: [{ type: "text", text }] }],
    maxTokens: 8000,
    timeoutMs: 130_000,
    // Researched like the original guides: specialist keepers, breeders' reports and papers.
    webSearch: 5,
  });
  return { json: parseJson(finalText(reply.content)), cents: costCents(OPS_MODELS.smart, reply.usage) + (reply.webSearches ?? 0) };
}

export type DraftResult = { ok: true; slug: string; cents: number } | { ok: false; error: string; cents: number };

export async function draftGuide(speciesSlug: string, opts: { note?: string } = {}): Promise<DraftResult> {
  let cents = 0;
  const { data: sp } = await supabaseAdmin.from("species").select("*").eq("slug", speciesSlug).maybeSingle();
  if (!sp) return { ok: false, error: "That species isn't in the library.", cents };
  const s = sp as Record<string, unknown>;
  if (["variety", "form"].includes(String(s.entry_type ?? ""))) {
    return { ok: false, error: "It's a variety: its page shows the parent species' guide.", cents };
  }

  const { data: existing } = await supabaseAdmin
    .from("breeding_guides")
    .select("id, slug, is_published, sections, review_notes")
    .eq("species_slug", speciesSlug)
    .limit(1)
    .maybeSingle();
  if (existing?.is_published) return { ok: false, error: "It already has a published guide.", cents };

  // The example: a finished guide from the same group if there is one, so the style matches.
  const { data: sameGroup } = await supabaseAdmin
    .from("species")
    .select("slug")
    .eq("group_name", String(s.group_name ?? ""))
    .limit(200);
  const groupSlugs = (sameGroup ?? []).map((r) => r.slug as string);
  let { data: example } = await supabaseAdmin
    .from("breeding_guides")
    .select("seo_title, summary, intro, facts, sections, faq")
    .eq("is_published", true)
    .in("species_slug", groupSlugs.length ? groupSlugs : ["-"])
    .limit(1)
    .maybeSingle();
  if (!example) {
    ({ data: example } = await supabaseAdmin
      .from("breeding_guides")
      .select("seo_title, summary, intro, facts, sections, faq")
      .eq("slug", "paradise-fish")
      .maybeSingle());
  }

  // On the Society list? Then the guide gets the logging tip too.
  const { data: award } = await supabaseAdmin
    .from("club_award_species")
    .select("id")
    .eq("species_slug", speciesSlug)
    .limit(1)
    .maybeSingle();

  const care = [
    "common_name", "scientific_name", "family", "group_name", "origin", "temp_min_f", "temp_max_f", "ph_min", "ph_max",
    "gh_min", "gh_max", "max_size_in", "min_tank_gal", "temperament", "social", "min_group_size", "diet", "breeding_type",
    "lifespan", "summary", "body",
  ]
    .map((k) => `${k}: ${s[k] ?? ""}`)
    .join("\n");

  const writerText = `Write the breeding guide for this species.

## The species page (everyday care data)
${care}

## Example of a finished guide (match its shape, depth and tone, not its facts)
${JSON.stringify(example ?? {}, null, 1).slice(0, 12000)}
${award ? "\nThis species is on the Society's point list, so also write society_tip: one or two sentences on what photos make a strong spawn log for it." : ""}
${opts.note ? `\n## Chris asked for this change to the last draft\n${opts.note}\n` : ""}
Reply with ONLY a JSON object: {"seo_title","summary","intro","facts":{...},"sections":[{"heading","text"}],"faq":[{"q","a"}]${award ? ',"society_tip"' : ""}}`;

  const first = await ask(STANDARD, writerText).catch((e: unknown) => ({ json: null, cents: 0, err: e }));
  cents += first.cents;
  const draft = clean(first.json);
  if (!draft) return { ok: false, error: "The writing pass didn't produce a usable guide. Try again.", cents };

  const checkerSystem = `${STANDARD}

You are now the fact-checker, not the writer. Check the draft claim by claim: how this species breeds, how to sex
it, every number (temperatures, spawn or brood sizes, hatch and gestation times, days to free swimming, growth),
first foods, and whether the parents eat the young. Fix anything wrong or overstated in place. Where you aren't
confident of a claim, soften it to what is commonly reported or remove it. Check it never advises water outside
the everyday care range except as a named spawning trigger. Keep the shape and the {{...}} placeholders.`;

  const check = await ask(
    checkerSystem,
    `## The species page\n${care}\n\n## The draft\n${JSON.stringify(draft)}\n\nReply with ONLY a JSON object:
{"guide": <the corrected guide, same shape>, "changed": ["what you fixed and why", ...],
 "unsure": ["claims Chris may want to confirm", ...], "confidence": "high|medium|low"}`
  ).catch(() => ({ json: null, cents: 0 }));
  cents += check.cents;
  const checked = clean((check.json?.guide ?? null) as Record<string, unknown> | null);
  if (!checked) return { ok: false, error: "The fact-check pass didn't finish. Try again.", cents };

  const list = (v: unknown) =>
    (Array.isArray(v) ? v : []).map((x) => str(x, 300)).filter(Boolean).slice(0, 12);
  const changed = list(check.json?.changed);
  const unsure = list(check.json?.unsure);
  const confidence = ["high", "medium", "low"].includes(String(check.json?.confidence)) ? String(check.json?.confidence) : "medium";
  const notes = [
    `Fact-check confidence: ${confidence}.`,
    changed.length ? `Fixed by the fact-check:\n${changed.map((x) => `- ${x}`).join("\n")}` : "The fact-check found nothing to fix.",
    unsure.length ? `Worth confirming:\n${unsure.map((x) => `- ${x}`).join("\n")}` : "",
    opts.note ? `Redrafted after your note: ${opts.note}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const row = {
    species_slug: speciesSlug,
    award_species_id: (award?.id as string | undefined) ?? null,
    seo_title: checked.seo_title,
    summary: checked.summary,
    intro: checked.intro,
    facts: checked.facts,
    sections: checked.sections,
    faq: checked.faq,
    society_tip: award ? checked.society_tip ?? null : null,
    is_published: false,
    review_notes: notes,
    drafted_at: new Date().toISOString(),
    draft_cost_cents: Math.round(cents * 10) / 10,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabaseAdmin.from("breeding_guides").update(row).eq("id", existing.id);
    if (error) return { ok: false, error: error.message, cents };
    return { ok: true, slug: existing.slug as string, cents };
  }
  // The guide's address is the species' own slug unless something else already has it.
  const { data: taken } = await supabaseAdmin.from("breeding_guides").select("id").eq("slug", speciesSlug).maybeSingle();
  const slug = taken ? `${speciesSlug}-breeding` : speciesSlug;
  const { error } = await supabaseAdmin.from("breeding_guides").insert({ slug, ...row });
  if (error) return { ok: false, error: error.message, cents };
  return { ok: true, slug, cents };
}
