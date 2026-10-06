import { supabasePublic } from "@/lib/supabase/public";

/**
 * Which species can crossbreed (species_crosses, step 77). One row per pair,
 * fact-checked and kept small on purpose: a wrong pair is worse than a
 * missing one. Varieties use their parent species' pairs.
 */

export type CrossOutcome = "fertile" | "sterile" | "rare";

export type CrossRow = {
  species_a: string;
  species_b: string;
  outcome: CrossOutcome;
  result_slug: string | null;
  note: string;
};

export type Cross = { slug: string; outcome: CrossOutcome; note: string; resultSlug: string | null };

export const OUTCOME_LABEL: Record<CrossOutcome, string> = {
  fertile: "Fertile young",
  sterile: "Young are usually sterile",
  rare: "Happens occasionally",
};

let cached: { at: number; rows: Promise<CrossRow[]> } | null = null;

/** Every pair, shared for a few minutes (the list is small). */
export function loadCrosses(): Promise<CrossRow[]> {
  if (!cached || Date.now() - cached.at > 10 * 60_000) {
    const rows = Promise.resolve(
      supabasePublic.from("species_crosses").select("species_a, species_b, outcome, result_slug, note").order("species_a")
    ).then(({ data, error }) => {
      if (error) cached = null; // table not there yet, or a blip: try again next time
      return (data ?? []) as CrossRow[];
    });
    cached = { at: Date.now(), rows };
  }
  return cached.rows;
}

/** Pairs by species slug, both directions. */
export function crossMap(rows: CrossRow[]): Map<string, Cross[]> {
  const m = new Map<string, Cross[]>();
  const add = (k: string, c: Cross) => m.set(k, [...(m.get(k) ?? []), c]);
  for (const r of rows) {
    add(r.species_a, { slug: r.species_b, outcome: r.outcome, note: r.note, resultSlug: r.result_slug });
    add(r.species_b, { slug: r.species_a, outcome: r.outcome, note: r.note, resultSlug: r.result_slug });
  }
  return m;
}

/** The pairs for one species page (a variety uses its parent's), and what a hybrid was bred from. */
export async function crossesFor(slug: string, parentSlug?: string | null): Promise<{ crosses: Cross[]; bredFrom: CrossRow[] }> {
  const rows = await loadCrosses();
  const m = crossMap(rows);
  return {
    crosses: m.get(slug) ?? (parentSlug ? m.get(parentSlug) ?? [] : []),
    bredFrom: rows.filter((r) => r.result_slug === slug),
  };
}
