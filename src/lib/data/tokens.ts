import { supabasePublic } from "@/lib/supabase/public";
import { FACT_TEXT } from "@/lib/data/facts";

/**
 * Live numbers inside written text, so a page can never disagree with the
 * species data or the shared facts.
 *
 *   {{temp}}            this species' temperature range ("72 to 78")
 *   {{neon-tetra.ph}}   another species' pH range
 *   {{fact.nitrate_ok}} a shared fact from facts.ts
 *
 * Units stay in the sentence ("{{temp}}°F", "{{tank}} gallons"). Keys:
 * temp, temp_min, temp_max, ph, ph_min, ph_max, gh, gh_min, gh_max, size,
 * tank, group, lifespan, name.
 */

export type TokenRow = {
  slug: string;
  common_name?: string | null;
  temp_min_f?: number | null;
  temp_max_f?: number | null;
  ph_min?: number | null;
  ph_max?: number | null;
  gh_min?: number | null;
  gh_max?: number | null;
  max_size_in?: number | null;
  min_tank_gal?: number | null;
  min_group_size?: number | null;
  lifespan?: string | null;
};

export const TOKEN_COLUMNS =
  "slug, common_name, temp_min_f, temp_max_f, ph_min, ph_max, gh_min, gh_max, max_size_in, min_tank_gal, min_group_size, lifespan";

const TOKEN = /\{\{\s*([a-z0-9-]+)(?:\.([a-z0-9_]+))?\s*\}\}/g;

// 6.0 -> "6", 6.5 -> "6.5", 2.80 -> "2.8"
function num(v: number | null | undefined): string | null {
  if (v == null || Number.isNaN(Number(v))) return null;
  return String(Number(Number(v).toFixed(1)));
}
function pair(a: number | null | undefined, b: number | null | undefined): string | null {
  const x = num(a), y = num(b);
  if (x == null || y == null) return null;
  return x === y ? x : `${x} to ${y}`;
}

function field(row: TokenRow, key: string): string | null {
  switch (key) {
    case "temp": return pair(row.temp_min_f, row.temp_max_f);
    case "temp_min": return num(row.temp_min_f);
    case "temp_max": return num(row.temp_max_f);
    case "ph": return pair(row.ph_min, row.ph_max);
    case "ph_min": return num(row.ph_min);
    case "ph_max": return num(row.ph_max);
    case "gh": return pair(row.gh_min, row.gh_max);
    case "gh_min": return num(row.gh_min);
    case "gh_max": return num(row.gh_max);
    case "size": return num(row.max_size_in);
    case "tank": return num(row.min_tank_gal);
    case "group": return num(row.min_group_size);
    case "lifespan": return row.lifespan ? row.lifespan.replace(/(\d)\s*-\s*(\d)/g, "$1 to $2") : null;
    case "name": return row.common_name ?? null;
    default: return null;
  }
}

/** Slugs of other species a set of texts refers to. */
export function tokenSlugs(texts: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    for (const m of t.matchAll(TOKEN)) if (m[2] && m[1] !== "fact") out.add(m[1]);
  }
  return [...out];
}

/** Fill every placeholder. Anything that can't be filled reads "varies" rather than breaking the sentence. */
export function fillTokens(text: string, self?: TokenRow | null, others?: Map<string, TokenRow>): string;
export function fillTokens(text: null | undefined, self?: TokenRow | null, others?: Map<string, TokenRow>): null;
export function fillTokens(text: string | null | undefined, self?: TokenRow | null, others?: Map<string, TokenRow>): string | null;
export function fillTokens(text: string | null | undefined, self?: TokenRow | null, others?: Map<string, TokenRow>): string | null {
  if (text == null) return null;
  if (!text.includes("{{")) return text;
  return text.replace(TOKEN, (_all, a: string, b?: string) => {
    if (!b) return (self && field(self, a)) ?? "varies";
    if (a === "fact") return FACT_TEXT[b] ?? "varies";
    const row = others?.get(a) ?? (self?.slug === a ? self : undefined);
    return (row && field(row, b)) ?? "varies";
  });
}

/** Load the species rows a set of texts refers to. */
export async function loadTokenRows(texts: (string | null | undefined)[]): Promise<Map<string, TokenRow>> {
  const slugs = tokenSlugs(texts);
  const map = new Map<string, TokenRow>();
  if (slugs.length === 0) return map;
  const { data } = await supabasePublic.from("species").select(TOKEN_COLUMNS).in("slug", slugs);
  for (const r of (data ?? []) as unknown as TokenRow[]) map.set(r.slug, r);
  return map;
}

/** Fill placeholders anywhere inside a JSON value (guide facts, sections, FAQs). */
export function fillDeep<T>(value: T, self?: TokenRow | null, others?: Map<string, TokenRow>): T {
  if (typeof value === "string") return fillTokens(value, self, others) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, self, others)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = fillDeep(v, self, others);
    return out as T;
  }
  return value;
}

/** Every placeholder in a text, for the weekly data check. */
export function listTokens(text: string | null | undefined): { slug: string | null; key: string; raw: string }[] {
  if (!text) return [];
  return [...text.matchAll(TOKEN)].map((m) => (m[2] ? { slug: m[1], key: m[2], raw: m[0] } : { slug: null, key: m[1], raw: m[0] }));
}

export const TOKEN_KEYS = ["temp", "temp_min", "temp_max", "ph", "ph_min", "ph_max", "gh", "gh_min", "gh_max", "size", "tank", "group", "lifespan", "name"];

/**
 * Turn a species' own numbers typed into its text into live placeholders, so
 * the text follows the row if the row is corrected later. Exact matches only:
 * "72 to 78°F" becomes "{{temp}}°F" only when the row says 72 to 78.
 */
export function tokenizeOwnNumbers(text: string | null | undefined, row: TokenRow): string | null {
  if (!text) return text ?? null;
  const N = String.raw`(\d+(?:\.\d+)?)`;
  const R = N + String.raw`\s*(?:to|-)\s*` + N;
  const eq = (a: string, b: number | null | undefined) => b != null && Math.abs(Number(a) - Number(b)) < 1e-9;
  let t = text;
  t = t.replace(new RegExp(R + String.raw`(\s*°\s*F|\s?F\b|°)`, "g"), (all, a, b, u) =>
    eq(a, row.temp_min_f) && eq(b, row.temp_max_f) ? `{{temp}}${u}` : all
  );
  t = t.replace(new RegExp(String.raw`(pH(?: of| around| about| between)?\s*)` + R, "g"), (all, p, a, b) =>
    eq(a, row.ph_min) && eq(b, row.ph_max) ? `${p}{{ph}}` : all
  );
  t = t.replace(new RegExp(String.raw`(GH(?: of| around| about)?\s*)` + R, "g"), (all, p, a, b) =>
    eq(a, row.gh_min) && eq(b, row.gh_max) ? `${p}{{gh}}` : all
  );
  t = t.replace(new RegExp(String.raw`(?<!\d\s*(?:to|-)\s*)(?<![\d.])` + N + String.raw`(?!\s*to\s*\d)(\s*(?:-\s*)?gallons?\b|\s*gal\b)`, "g"), (all, a, u) =>
    eq(a, row.min_tank_gal) ? `{{tank}}${u}` : all
  );
  t = t.replace(new RegExp(String.raw`(?<!\d\s*(?:to|-)\s*)(?<![\d.])` + N + String.raw`(?!\s*to\s*\d)(\s*(?:-\s*)?inch(?:es)?\b)`, "g"), (all, a, u) =>
    eq(a, row.max_size_in) ? `{{size}}${u}` : all
  );
  return t;
}
