import { supabaseAdmin } from "@/lib/supabase/admin";
import { FACT_TEXT } from "@/lib/data/facts";
import { listTokens, TOKEN_KEYS } from "@/lib/data/tokens";

/**
 * The weekly data check. Pages read numbers from one place (species rows,
 * lib/data/facts.ts), but text can still be typed by hand or a row edited
 * badly, so this looks for anything that disagrees and files it on the AI
 * team's page (ops_findings, kind 'data') for Chris. No AI involved: plain
 * rules, free to run.
 */

type Row = Record<string, unknown> & { slug: string; common_name: string };

// What a variety or form takes from its parent (the database keeps them in step; see step 76).
const INHERITED = [
  "temp_min_f", "temp_max_f", "ph_min", "ph_max", "gh_min", "gh_max",
  "diet", "social", "temperament", "swim_level", "breeding_type",
] as const;

// Words that mark a number as something other than the everyday care range.
const OTHER_CONTEXT = /wild|spawn|breed|fry|egg|winter|cool(?:er)? period|trigger|hatch|condition|in nature|native/i;

const n = (v: unknown) => (v == null ? null : Number(v));
// A narrower range inside the species' range (a spawning or "aim for" range) is fine;
// one that goes outside it contradicts the species page.
const outside = (a: unknown, b: unknown, min: unknown, max: unknown) =>
  n(min) != null && n(max) != null && (n(a)! < n(min)! || n(b)! > n(max)!);
const sentences = (t: string) => t.split(/(?<=[.!?\n])\s+/);

export type DataIssue = { group: string; item: string };

async function all<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin.from(table).select(cols).range(from, from + 999);
    if (error || !data) break;
    out.push(...(data as unknown as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

function rangesIn(text: string, re: RegExp): { a: number; b: number; sentence: string }[] {
  const out: { a: number; b: number; sentence: string }[] = [];
  for (const s of sentences(text)) {
    if (OTHER_CONTEXT.test(s)) continue;
    for (const m of s.matchAll(re)) out.push({ a: Number(m[1]), b: Number(m[2]), sentence: s.trim().slice(0, 140) });
  }
  return out;
}
const TEMP_RE = /(\d{2})\s*(?:to|-)\s*(\d{2})\s*°?\s?F\b/g;
const PH_RE = /pH(?: of| around| about| between)?\s*(\d(?:\.\d)?)\s*(?:to|-|and)\s*(\d(?:\.\d)?)/g;

type Guide = { slug: string; species_slug: string | null; intro: string; sections: unknown; faq: unknown; facts: unknown };
type Term = { slug: string; body: string; sections: unknown; faq: unknown };
type Lesson = { id: string; title: string; content: string };
type Award = { id: string; common_name: string; scientific_name: string | null; species_slug: string | null };
export type DataSet = { species: Row[]; guides: Guide[]; glossary: Term[]; lessons: Lesson[]; awards: Award[] };

export async function loadDataSet(): Promise<DataSet> {
  const [species, guides, glossary, lessons, awards] = await Promise.all([
    all<Row>(
      "species",
      "slug, common_name, scientific_name, entry_type, parent_slug, summary, body, temp_min_f, temp_max_f, ph_min, ph_max, gh_min, gh_max, diet, social, temperament, swim_level, breeding_type, min_group_size, max_size_in, min_tank_gal"
    ),
    all<Guide>("breeding_guides", "slug, species_slug, intro, sections, faq, facts"),
    all<Term>("glossary_terms", "slug, body, sections, faq"),
    all<Lesson>("course_sections", "id, title, content"),
    all<Award>("club_award_species", "id, common_name, scientific_name, species_slug"),
  ]);
  return { species, guides, glossary, lessons, awards };
}

/** Pure rules, so they can be tested on a copy of the data. */
export function findDataIssues({ species, guides, glossary, lessons, awards }: DataSet): DataIssue[] {
  const issues: DataIssue[] = [];
  const add = (group: string, item: string) => issues.push({ group, item });

  const bySlug = new Map(species.map((s) => [s.slug, s]));

  // 1. Varieties must match their parent species.
  for (const s of species) {
    const p = s.parent_slug ? bySlug.get(String(s.parent_slug)) : undefined;
    if (!p || !["variety", "form"].includes(String(s.entry_type))) continue;
    const diff = INHERITED.filter((f) => String(s[f] ?? "") !== String(p[f] ?? ""));
    if (diff.length) add("Varieties that don't match their parent species", `${s.common_name}: ${diff.join(", ")} differ from ${p.common_name}`);
  }

  // 2. Safe-side limits and broken ranges.
  for (const s of species) {
    const why: string[] = [];
    if (n(s.ph_min) != null && n(s.ph_min)! < 5.5) why.push(`pH min ${s.ph_min}`);
    if (n(s.ph_max) != null && n(s.ph_max)! > 8.6) why.push(`pH max ${s.ph_max}`);
    if (n(s.temp_max_f) != null && n(s.temp_max_f)! > 86) why.push(`temp max ${s.temp_max_f}°F`);
    if (n(s.ph_min) != null && n(s.ph_max) != null && n(s.ph_min)! >= n(s.ph_max)!) why.push("pH min not below max");
    if (n(s.temp_min_f) != null && n(s.temp_max_f) != null && n(s.temp_min_f)! >= n(s.temp_max_f)!) why.push("temp min not below max");
    if (s.social === "Schooling" && (n(s.min_group_size) ?? 0) < 6) why.push("schooling but group under 6");
    if ((n(s.max_size_in) ?? 0) >= 10 && (n(s.min_tank_gal) ?? 0) < 75 && s.slug !== "axolotl") why.push(`${s.max_size_in} in fish in ${s.min_tank_gal} gal`);
    if (why.length) add("Species numbers outside the safe limits", `${s.common_name}: ${why.join("; ")}`);
  }

  // 3. Numbers typed into species text that disagree with the row.
  for (const s of species) {
    const text = [s.summary, s.body].filter(Boolean).join("\n");
    for (const r of rangesIn(text, TEMP_RE)) {
      if (outside(r.a, r.b, s.temp_min_f, s.temp_max_f)) add("Species text that disagrees with its numbers", `${s.common_name}: "${r.sentence}" (row says ${s.temp_min_f} to ${s.temp_max_f}°F)`);
    }
    for (const r of rangesIn(text, PH_RE)) {
      if (outside(r.a, r.b, s.ph_min, s.ph_max)) add("Species text that disagrees with its numbers", `${s.common_name}: "${r.sentence}" (row says pH ${s.ph_min} to ${s.ph_max})`);
    }
  }

  // 4. Breeding guides that quote the care data with numbers outside it.
  for (const g of guides) {
    const s = g.species_slug ? bySlug.get(g.species_slug) : undefined;
    if (!s) continue;
    const text = [g.intro, JSON.stringify([g.facts, g.sections, g.faq])].join("\n");
    for (const sent of sentences(text)) {
      if (!/librar|site lists|care range|care numbers|care page|care guide/i.test(sent)) continue;
      for (const m of sent.matchAll(TEMP_RE)) {
        const before = sent.slice(Math.max(0, (m.index ?? 0) - 60), m.index ?? 0);
        if (outside(m[1], m[2], s.temp_min_f, s.temp_max_f) && !OTHER_CONTEXT.test(before))
          add("Breeding guides that misquote the species page", `${g.slug}: "${sent.trim().slice(0, 140)}" (species page: ${s.temp_min_f} to ${s.temp_max_f}°F)`);
      }
    }
  }

  // 5. Placeholders that point at nothing.
  const texts: [string, string][] = [
    ...species.map((s) => [`Species ${s.slug}`, `${s.summary ?? ""} ${s.body ?? ""}`] as [string, string]),
    ...guides.map((g) => [`Guide ${g.slug}`, `${g.intro} ${JSON.stringify([g.facts, g.sections, g.faq])}`] as [string, string]),
    ...glossary.map((g) => [`Glossary ${g.slug}`, `${g.body ?? ""} ${JSON.stringify([g.sections, g.faq])}`] as [string, string]),
    ...lessons.map((l) => [`Lesson "${l.title}"`, l.content ?? ""] as [string, string]),
  ];
  for (const [where, t] of texts) {
    for (const tok of listTokens(t)) {
      const ok =
        tok.slug === "fact" ? tok.key in FACT_TEXT : TOKEN_KEYS.includes(tok.key) && (tok.slug == null || bySlug.has(tok.slug));
      // A bare {{temp}} only works on a species page or a guide tied to one.
      const bareOk = tok.slug != null || where.startsWith("Species") || where.startsWith("Guide");
      if (!ok || !bareOk) add("Live numbers that can't be filled", `${where}: ${tok.raw}`);
    }
  }

  // 6. The Society list should use the same scientific name as the species page.
  for (const a of awards) {
    const s = a.species_slug ? bySlug.get(a.species_slug) : undefined;
    if (!s || !a.scientific_name || /spp\./.test(a.scientific_name)) continue;
    if (a.scientific_name !== s.scientific_name) add("Society list names that differ from the species page", `${a.common_name}: "${a.scientific_name}" vs "${s.scientific_name}"`);
  }

  return issues;
}

const LINKS: Record<string, string> = {
  "Varieties that don't match their parent species": "/admin/species",
  "Species numbers outside the safe limits": "/admin/species",
  "Species text that disagrees with its numbers": "/admin/species",
  "Breeding guides that misquote the species page": "/breeding",
  "Live numbers that can't be filled": "/admin/species",
  "Society list names that differ from the species page": "/society",
};

/** Run the check and file (or refresh) one finding per kind of problem. */
export async function runDataCheck(): Promise<{ issues: number; filed: number }> {
  const issues = findDataIssues(await loadDataSet());
  const groups = new Map<string, string[]>();
  for (const i of issues) groups.set(i.group, [...(groups.get(i.group) ?? []), i.item]);
  let filed = 0;
  for (const [group, items] of groups) {
    const title = `Data check: ${group}`;
    const detail = `${items.length} found:\n\n${items.slice(0, 60).map((x) => `- ${x}`).join("\n")}${items.length > 60 ? `\n- and ${items.length - 60} more` : ""}`;
    const { data: open } = await supabaseAdmin
      .from("ops_findings")
      .select("id")
      .eq("title", title)
      .in("status", ["new", "open", "in_progress"])
      .limit(1);
    if (open && open.length) {
      await supabaseAdmin.from("ops_findings").update({ detail, updated_at: new Date().toISOString() }).eq("id", open[0].id);
    } else {
      await supabaseAdmin.from("ops_findings").insert({
        worker_key: "qa",
        role: "qa",
        kind: "data",
        risk: group.includes("safe limits") ? "high" : "medium",
        title,
        detail,
        suggested_action: "Fix the source (the species row, the facts file or the text) so every page reads the same number. Use live numbers like {{temp}} in text instead of typing them.",
        link: LINKS[group] ?? "/admin/species",
      });
      filed++;
    }
  }
  return { issues: issues.length, filed };
}
