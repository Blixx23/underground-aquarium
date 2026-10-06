import { supabasePublic } from "@/lib/supabase/public";
import { fillTokens, fillDeep, loadTokenRows, TOKEN_COLUMNS, type TokenRow } from "@/lib/data/tokens";
import { CLASS_LADDER, classForPoints } from "@/lib/society/classes";

/**
 * Breeding guides: one per species on the Society's point list.
 *
 * The guide row holds only what's about breeding. The name, category and
 * points come from the Society's list (club_award_species) and the water
 * numbers from the species library, so changing a point value or a care
 * range in one place updates every guide.
 */

export type GuideFacts = Record<string, string>;
export type GuideSection = { heading: string; text: string };
export type GuideFaq = { q: string; a: string };

export type GuideCard = {
  slug: string;
  name: string;
  scientific: string | null;
  category: string | null;
  program: "bap" | "hap";
  points: number | null;
  classLetter: string | null;
  method: string | null;
  summary: string;
  speciesSlug: string | null;
  awardId: string | null;
  /** Other names and old scientific names from the species library, for search. */
  aliases: string[];
};

export type Guide = GuideCard & {
  seoTitle: string;
  intro: string;
  facts: GuideFacts;
  sections: GuideSection[];
  faq: GuideFaq[];
  societyTip: string | null;
  glossarySlug: string | null;
  updatedAt: string | null;
};

type GuideRow = {
  slug: string;
  award_species_id: string | null;
  species_slug: string | null;
  glossary_slug: string | null;
  seo_title: string;
  summary: string;
  intro: string;
  facts: GuideFacts | null;
  sections: GuideSection[] | null;
  faq: GuideFaq[] | null;
  society_tip: string | null;
  updated_at: string | null;
};

type AwardRow = {
  id: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  points: number;
  program: string;
};

function toCard(g: GuideRow, a: AwardRow | undefined): GuideCard {
  const points = a?.points ?? null;
  return {
    slug: g.slug,
    name: a?.common_name ?? g.slug.replace(/-/g, " "),
    scientific: a?.scientific_name ?? null,
    category: a?.category ?? null,
    program: a?.program === "hap" ? "hap" : "bap",
    points,
    classLetter: points != null ? classForPoints(points) : null,
    method: g.facts?.method ?? null,
    summary: g.summary,
    speciesSlug: g.species_slug,
    awardId: a?.id ?? g.award_species_id,
    aliases: [],
  };
}

async function awardsById(ids: string[]): Promise<Map<string, AwardRow>> {
  const out = new Map<string, AwardRow>();
  if (ids.length === 0) return out;
  const { data } = await supabasePublic
    .from("club_award_species")
    .select("id, common_name, scientific_name, category, points, program")
    .in("id", ids);
  for (const a of (data ?? []) as AwardRow[]) out.set(a.id, a);
  return out;
}

/** Every published guide as a card, easiest first. */
export async function loadGuideCards(): Promise<GuideCard[]> {
  const { data, error } = await supabasePublic
    .from("breeding_guides")
    .select("slug, award_species_id, species_slug, glossary_slug, summary, facts")
    .order("slug");
  if (error || !data) return [];
  const rows = data as unknown as GuideRow[];
  const awards = await awardsById(rows.map((r) => r.award_species_id).filter((x): x is string => !!x));
  // Other names from the species library, so "X-ray tetra" or "Corydoras panda" finds its guide.
  const slugs = [...new Set(rows.map((r) => r.species_slug).filter((x): x is string => !!x))];
  const names = new Map<string, string[]>();
  const tokenRows = new Map<string, TokenRow>();
  if (slugs.length) {
    const { data: sp } = await supabasePublic
      .from("species")
      .select(`${TOKEN_COLUMNS}, also_known_as, former_names, trade_codes`)
      .in("slug", slugs);
    for (const s of (sp ?? []) as unknown as (TokenRow & { common_name: string; also_known_as: string[] | null; former_names: string[] | null; trade_codes: string[] | null })[]) {
      names.set(s.slug, [s.common_name, ...(s.also_known_as ?? []), ...(s.former_names ?? []), ...(s.trade_codes ?? [])]);
      tokenRows.set(s.slug, s);
    }
  }
  return rows
    .map((r) => {
      const card = toCard(r, r.award_species_id ? awards.get(r.award_species_id) : undefined);
      card.aliases = (r.species_slug ? names.get(r.species_slug) ?? [] : []).filter((n) => n && n !== card.name);
      card.summary = fillTokens(card.summary, r.species_slug ? tokenRows.get(r.species_slug) : null, tokenRows);
      return card;
    })
    .sort((a, b) => (a.points ?? 999) - (b.points ?? 999) || a.name.localeCompare(b.name));
}

export async function loadGuide(slug: string): Promise<Guide | null> {
  const { data } = await supabasePublic.from("breeding_guides").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const g = data as unknown as GuideRow;
  const awards = await awardsById(g.award_species_id ? [g.award_species_id] : []);
  // Numbers in the guide text come live from the species data (lib/data/tokens.ts).
  const texts = [g.summary, g.intro, g.society_tip, JSON.stringify([g.facts, g.sections, g.faq])];
  const others = await loadTokenRows(g.species_slug ? [...texts, `{{${g.species_slug}.name}}`] : texts);
  const self = g.species_slug ? others.get(g.species_slug) ?? null : null;
  const card = toCard(g, g.award_species_id ? awards.get(g.award_species_id) : undefined);
  return {
    ...card,
    summary: fillTokens(card.summary, self, others),
    seoTitle: fillTokens(g.seo_title, self, others),
    intro: fillTokens(g.intro, self, others),
    facts: fillDeep(g.facts ?? {}, self, others),
    sections: fillDeep(Array.isArray(g.sections) ? g.sections : [], self, others),
    faq: fillDeep(Array.isArray(g.faq) ? g.faq : [], self, others),
    societyTip: fillTokens(g.society_tip, self, others),
    glossarySlug: g.glossary_slug,
    updatedAt: g.updated_at,
  };
}

/** The guide for a species library page, if one exists. */
export async function guideForSpecies(speciesSlug: string): Promise<{ slug: string; points: number | null } | null> {
  const { data } = await supabasePublic
    .from("breeding_guides")
    .select("slug, award_species_id")
    .eq("species_slug", speciesSlug)
    .limit(1);
  const row = (data ?? [])[0] as { slug: string; award_species_id: string | null } | undefined;
  if (!row) return null;
  const awards = await awardsById(row.award_species_id ? [row.award_species_id] : []);
  return { slug: row.slug, points: (row.award_species_id && awards.get(row.award_species_id)?.points) || null };
}

/**
 * Easier fish to start with: first the next steps down in the same group
 * (a Class E cichlid points to Class B to D cichlids), then easy fish from
 * any group. Easiest-class guides suggest other easy ones in their group.
 */
export function easierThan(guide: GuideCard, all: GuideCard[], n = 4): GuideCard[] {
  const pts = guide.points ?? 999;
  const others = all.filter((g) => g.slug !== guide.slug && g.program === guide.program && g.points != null);
  const sameGroup = others.filter((g) => g.category === guide.category);
  const lowest = CLASS_LADDER[0].points;
  const pool =
    pts <= lowest
      ? sameGroup.filter((g) => g.points === lowest)
      : sameGroup.filter((g) => (g.points ?? 0) < pts).sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const picked: GuideCard[] = [];
  for (const g of pool) if (picked.length < n) picked.push(g);
  // Fill up with the easiest fish anywhere, so every page has a real next step.
  if (picked.length < n && pts > lowest) {
    for (const g of others.filter((x) => (x.points ?? 0) < pts).sort((a, b) => (a.points ?? 0) - (b.points ?? 0))) {
      if (picked.length >= n) break;
      if (!picked.some((p) => p.slug === g.slug)) picked.push(g);
    }
  }
  return picked;
}

/** Labels for the quick-facts box, in display order. */
export const FACT_LABELS: [string, string][] = [
  ["method", "How they breed"],
  ["sexing", "Telling the sexes apart"],
  ["group", "Breeding group"],
  ["breeding_tank", "Breeding tank"],
  ["conditioning", "Conditioning"],
  ["trigger", "What triggers spawning"],
  ["spawn", "Spawn size"],
  ["eggs", "Eggs or pregnancy"],
  ["fry", "Fry"],
  ["first_foods", "First foods"],
  ["grow_out", "Growing out"],
  ["parents", "Parents"],
  ["light", "Light"],
  ["co2", "CO2"],
  ["substrate", "Substrate"],
  ["timeline", "How fast"],
  ["first_steps", "First steps"],
];

/** "Class C · 15 points", or just the points when off the ladder. */
export function classLabel(points: number | null): string {
  if (points == null) return "Not on the points list";
  const letter = classForPoints(points);
  return letter ? `Class ${letter} · ${points} points` : `${points} points`;
}
