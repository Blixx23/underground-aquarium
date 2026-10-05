import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The species library as one list, plus a name matcher that's forgiving the
 * way hobbyists are: "corydora" finds Corydoras, "cory" finds the Cory cats
 * group, "pleco" finds the plecos. Used by the species requests queue and the
 * AI check, so both see the same thing.
 */

export type LibraryEntry = {
  slug: string;
  common_name: string;
  scientific_name: string | null;
  also_known_as: string[] | null;
  former_names: string[] | null;
  trade_codes: string[] | null;
  group_name: string | null;
  entry_type: string | null;
  parent_slug: string | null;
  family: string | null;
};

const COLS = [
  "slug, common_name, scientific_name, also_known_as, former_names, trade_codes, group_name, entry_type, parent_slug, family",
  "slug, common_name, scientific_name, also_known_as, group_name, parent_slug",
  "slug, common_name, scientific_name, also_known_as, group_name",
];

/** Every species, tolerating older databases that lack some columns. */
export async function loadLibrary(): Promise<LibraryEntry[]> {
  for (const cols of COLS) {
    const out: LibraryEntry[] = [];
    let failed = false;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabaseAdmin
        .from("species")
        .select(cols)
        .order("common_name")
        .range(from, from + 999);
      if (error) {
        failed = true;
        break;
      }
      for (const r of (data ?? []) as unknown as Partial<LibraryEntry>[]) {
        out.push({
          slug: r.slug!,
          common_name: r.common_name!,
          scientific_name: r.scientific_name ?? null,
          also_known_as: r.also_known_as ?? null,
          former_names: r.former_names ?? null,
          trade_codes: r.trade_codes ?? null,
          group_name: r.group_name ?? null,
          entry_type: r.entry_type ?? null,
          parent_slug: r.parent_slug ?? null,
          family: r.family ?? null,
        });
      }
      if ((data ?? []).length < 1000) break;
    }
    if (!failed) return out;
  }
  return [];
}

// Hobby nicknames that don't share letters with the real name.
const SLANG: Record<string, string[]> = {
  cory: ["corydoras", "callichthyidae", "cory cats", "cories"],
  corie: ["corydoras"],
  pleco: ["loricariidae", "hypostomus", "ancistrus", "plecostomus", "plecos"],
  bristlenose: ["ancistrus"],
  betta: ["betta splendens", "siamese fighting fish"],
  fighter: ["betta"],
  guppy: ["poecilia reticulata"],
  endler: ["poecilia wingei"],
  molly: ["poecilia"],
  platy: ["xiphophorus"],
  swordtail: ["xiphophorus"],
  angel: ["pterophyllum", "angelfish"],
  discus: ["symphysodon"],
  oto: ["otocinclus"],
  kuhli: ["pangio"],
  loach: ["cobitidae", "botiidae", "nemacheilidae"],
  ram: ["mikrogeophagus"],
  apisto: ["apistogramma"],
  rasbora: ["trigonostigma", "boraras", "rasbora"],
  danio: ["danio", "devario"],
  tetra: ["characidae", "hyphessobrycon", "paracheirodon"],
  neon: ["paracheirodon"],
  gourami: ["osphronemidae", "trichogaster", "trichopodus"],
  shrimp: ["neocaridina", "caridina"],
  cherry: ["neocaridina"],
  amano: ["caridina multidentata"],
  nerite: ["neritina", "vittina"],
  mystery: ["pomacea"],
  crayfish: ["procambarus", "cambarellus", "cherax"],
  goldfish: ["carassius"],
  koi: ["cyprinus"],
  barb: ["puntius", "barbodes", "pethia", "puntigrus"],
  killi: ["killifish", "aphyosemion", "nothobranchius"],
  puffer: ["tetraodontidae", "carinotetraodon"],
};

/** Lowercase words, with plurals and possessives folded ("corydoras" -> "corydora", "cories" -> "cory"). */
export function nameWords(s: string | null | undefined): string[] {
  return (s ?? "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !["fish", "the", "and", "of", "a"].includes(w))
    .map(stem);
}

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("es") && /(ch|sh|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) return w.slice(0, -1);
  return w;
}

/** Edit distance, stopping early once it's past `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Same word allowing a plural-ish ending, or a typo or two in longer words ("cardnial" / "cardinal"). */
function close(a: string, b: string): boolean {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length >= 4 && l.startsWith(s) && l.length - s.length <= 2) return true;
  return s.length >= 6 && editDistance(a, b, 2) <= 2;
}

export type Candidate = { entry: LibraryEntry; score: number; why: string };

/**
 * Library entries that could be what the member asked for, best first.
 * Scores whole-name hits, genus hits, group hits and nickname hits.
 */
export function findCandidates(
  library: LibraryEntry[],
  request: { common_name: string; scientific_name?: string | null; note?: string | null },
  limit = 12
): Candidate[] {
  const asked = [...nameWords(request.common_name), ...nameWords(request.scientific_name)];
  const expanded = new Set(asked);
  for (const w of asked) for (const [k, vals] of Object.entries(SLANG)) if (close(w, k)) vals.forEach((v) => nameWords(v).forEach((x) => expanded.add(x)));
  const askedGenus = nameWords(request.scientific_name)[0] ?? null;

  const out: Candidate[] = [];
  for (const e of library) {
    const names = [e.common_name, ...(e.also_known_as ?? []), ...(e.former_names ?? []), ...(e.trade_codes ?? [])];
    const nameW = names.flatMap(nameWords);
    const sciW = nameWords(e.scientific_name);
    const groupW = nameWords(e.group_name);
    const famW = nameWords(e.family);

    let score = 0;
    const why: string[] = [];
    const hit = (pool: string[], set: Set<string> | string[]) =>
      [...set].filter((w) => pool.some((p) => close(p, w))).length;

    const exact = names.some((n) => n.toLowerCase().trim() === request.common_name.toLowerCase().trim());
    if (exact) {
      score += 100;
      why.push("same name");
    }
    const nh = hit(nameW, expanded);
    if (nh) {
      score += nh * 10;
      why.push("name");
    }
    const sh = hit(sciW, expanded);
    if (sh) {
      score += sh * 12;
      why.push("scientific name");
    }
    if (askedGenus && sciW[0] && close(askedGenus, sciW[0])) {
      score += 8;
      why.push("same genus");
    }
    const gh = hit(groupW, expanded);
    if (gh) {
      score += gh * 4;
      why.push(`group ${e.group_name}`);
    }
    if (hit(famW, expanded)) {
      score += 3;
      why.push(`family ${e.family}`);
    }
    if (score > 0) out.push({ entry: e, score, why: why.join(", ") });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** One line per species for the AI to read. */
export function libraryLine(e: LibraryEntry): string {
  const aka = [...(e.also_known_as ?? []), ...(e.former_names ?? [])];
  return [
    e.slug,
    e.common_name,
    e.scientific_name ?? "",
    e.group_name ?? "",
    e.family ?? "",
    aka.length ? `aka ${aka.join("; ")}` : "",
    e.trade_codes?.length ? `codes ${e.trade_codes.join("; ")}` : "",
    e.parent_slug ? `variant of ${e.parent_slug}` : "",
    e.entry_type && e.entry_type !== "species" ? `type ${e.entry_type}` : "",
  ]
    .map((x) => x.replace(/\|/g, "/"))
    .join(" | ")
    .replace(/( \| )+$/, "");
}

/**
 * The whole library as compact text for the AI, grouped under one heading
 * per group so the group name isn't repeated on every line. Family is left
 * out (the scientific name carries the genus). About a third smaller than
 * one libraryLine per fish, which is most of what a check costs.
 */
export function libraryText(library: LibraryEntry[]): string {
  const byGroup = new Map<string, LibraryEntry[]>();
  for (const e of library) {
    const g = e.group_name || "Other";
    byGroup.set(g, [...(byGroup.get(g) ?? []), e]);
  }
  const out: string[] = [];
  for (const [g, list] of [...byGroup].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`# ${g}`);
    for (const e of list) {
      const aka = [...(e.also_known_as ?? []), ...(e.former_names ?? [])];
      const parts = [e.slug, e.common_name, e.scientific_name ?? ""];
      if (aka.length) parts.push(`aka ${aka.join("; ")}`);
      if (e.trade_codes?.length) parts.push(e.trade_codes.join("; "));
      if (e.parent_slug) parts.push(`variant of ${e.parent_slug}`);
      if (e.entry_type && e.entry_type !== "species") parts.push(`type ${e.entry_type}`);
      out.push(parts.map((x) => x.replace(/\|/g, "/")).join(" | ").replace(/( \| )+$/, ""));
    }
  }
  return out.join("\n");
}
