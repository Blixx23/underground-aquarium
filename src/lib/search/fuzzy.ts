/**
 * Typo tolerance without a search service.
 *
 * We keep a vocabulary of every word that appears in what's being searched
 * (help answers, species, stores, listings...). When someone types a word
 * that isn't in it, we swap in the closest real word, allowing 1 typo in
 * short words and 2 in longer ones: "neon tetrs" becomes "neon tetra",
 * "shrmip" becomes "shrimp", "cliam my stoer" becomes "claim my store".
 *
 * Runs in the browser (help search) and on the server (site search), so no
 * Node imports here.
 */

import { queryTerms, stem } from "@/lib/search/terms";

export type Vocab = {
  /** stemmed word -> how often it appears (common words win ties) */
  counts: Map<string, number>;
  /** words grouped by length, for fast nearest-word lookups */
  byLen: Map<number, string[]>;
};

export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export function buildVocab(texts: Iterable<string>): Vocab {
  const counts = new Map<string, number>();
  for (const t of texts) {
    for (const w of words(t)) {
      if (w.length < 3 || w.length > 24 || /^\d+$/.test(w)) continue;
      // Keep the word as written and its stem, so "deus" can find "dues"
      // even though "dues" is stored stemmed as "due".
      counts.set(w, (counts.get(w) ?? 0) + 1);
      const s = stem(w);
      if (s !== w) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const byLen = new Map<number, string[]>();
  for (const w of counts.keys()) {
    const list = byLen.get(w.length) ?? [];
    list.push(w);
    byLen.set(w.length, list);
  }
  return { counts, byLen };
}

/** How many typos a word of this length may have. */
export function maxEdits(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

/**
 * Optimal string alignment distance (Levenshtein plus swapped neighbours,
 * so "tetar" -> "tetra" is one typo). Gives up early past `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length;
  const n = b.length;
  let prev2: number[] = new Array(n + 1).fill(0);
  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[n];
}

/**
 * Is this term already a real word? The last word may also be the start of
 * one, since the person may still be typing it ("shri" -> shrimp).
 */
function known(term: string, v: Vocab, isLast: boolean): boolean {
  if (v.counts.has(term)) return true;
  if (term.length < 3) return true; // too short to judge; leave it alone
  if (!/^[a-z]+$/.test(term)) return true; // numbers, codes like l046, "isn't": leave alone
  if (!isLast) return false;
  for (const [len, list] of v.byLen) {
    if (len <= term.length) continue;
    for (const w of list) if (w.startsWith(term)) return true;
  }
  return false;
}

/** The closest real word, or null if nothing is close enough. */
export function nearestWord(term: string, v: Vocab): string | null {
  const max = maxEdits(term.length);
  if (max === 0) return null;
  let best: string | null = null;
  let bestD = max + 1;
  let bestCount = -1;
  for (let len = term.length - max; len <= term.length + max; len++) {
    for (const w of v.byLen.get(len) ?? []) {
      const d = editDistance(term, w, Math.min(max, bestD));
      // Ties: people rarely get the first letter wrong, then prefer common words.
      const c = (v.counts.get(w) ?? 0) + (w[0] === term[0] ? 1_000_000 : 0);
      if (d < bestD || (d === bestD && c > bestCount)) {
        best = w;
        bestD = d;
        bestCount = c;
      }
    }
  }
  return bestD <= max ? best : null;
}

/**
 * Correct each unknown term. Returns the terms to search with, and whether
 * anything changed (so the page can say "Showing results for ...").
 */
export function correctTerms(terms: string[], v: Vocab): { terms: string[]; changed: boolean } {
  let changed = false;
  const out = terms.map((t, i) => {
    if (known(t, v, i === terms.length - 1)) return t;
    const fix = nearestWord(t, v);
    if (fix && fix !== t) {
      changed = true;
      return fix;
    }
    return t;
  });
  return { terms: out, changed };
}

/**
 * The person's own words with only the misspelled ones swapped, for a
 * "Showing results for ..." line: "cliam my stoer" -> "claim my store".
 */
export function describeFix(original: string, before: string[], after: string[]): string {
  const swaps = new Map<string, string>();
  before.forEach((t, i) => {
    if (after[i] && after[i] !== t) swaps.set(t, after[i]);
  });
  return original
    .trim()
    .split(/\s+/)
    .map((w) => {
      const key = queryTerms(w)[0];
      return key && swaps.has(key) ? swaps.get(key)! : w;
    })
    .join(" ");
}
