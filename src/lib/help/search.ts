import type { HelpSection } from "./types";

/**
 * Plain keyword search over help sections. Runs in the browser in a few
 * milliseconds, so it costs nothing to run. Misspellings are fixed against
 * the words the help docs actually use (see lib/search/fuzzy.ts).
 */

import { queryTerms, stem } from "@/lib/search/terms";
import { buildVocab, correctTerms, describeFix, type Vocab } from "@/lib/search/fuzzy";

export { queryTerms, stem };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type HelpHit = { s: HelpSection; score: number; snippet: string };

function termScore(term: string, heading: string, article: string, keywords: string, text: string): number {
  // Short terms ("ph", "gh", "kh", "co2") must match a whole word, or "ph" finds "photo".
  const wordStart = new RegExp(term.length <= 3 ? `\\b${escapeRe(term)}\\b` : `\\b${escapeRe(term)}`);
  if (wordStart.test(heading)) return 30;
  if (wordStart.test(keywords)) return 18;
  if (wordStart.test(article)) return 16;
  if (wordStart.test(text)) return 10;
  return 0;
}

export function makeSnippet(text: string, terms: string[], len = 170): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (idx < 0 || i < idx)) idx = i;
  }
  if (idx < 0) return text.length > len ? text.slice(0, len).trim() + "…" : text;
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, start + len);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

/**
 * Sections that contain every term rank first. If nothing contains all of
 * them, fall back to sections matching most terms, so a long question with
 * one odd word still gets an answer.
 */
function rankSections(sections: HelpSection[], terms: string[], limit: number): { hits: HelpHit[]; full: boolean } {
  if (!terms.length) return { hits: [], full: false };
  const scored: (HelpHit & { matched: number })[] = [];
  for (const s of sections) {
    const heading = s.heading.toLowerCase();
    const article = s.articleTitle.toLowerCase();
    const keywords = (s.keywords ?? "").toLowerCase();
    const text = s.text.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      const v = termScore(t, heading, article, keywords, text);
      if (v) matched++;
      score += v;
    }
    if (!matched) continue;
    if (!s.anchor) score -= 4; // prefer the specific section over the article intro
    scored.push({ s, score, matched, snippet: makeSnippet(s.text, terms) });
  }
  const full = scored.filter((h) => h.matched === terms.length);
  const pool = full.length ? full : scored.filter((h) => h.matched >= Math.max(1, Math.ceil(terms.length / 2)));
  pool.sort((a, b) => b.matched - a.matched || b.score - a.score);
  return {
    hits: pool.slice(0, limit).map(({ s, score, snippet }) => ({ s, score, snippet })),
    full: full.length > 0,
  };
}

// One vocabulary per index, built the first time it's searched.
const vocabs = new WeakMap<HelpSection[], Vocab>();
export function helpVocab(sections: HelpSection[]): Vocab {
  let v = vocabs.get(sections);
  if (!v) {
    v = buildVocab(sections.flatMap((s) => [s.heading, s.articleTitle, s.keywords ?? "", s.text]));
    vocabs.set(sections, v);
  }
  return v;
}

export type HelpSearchResult = {
  hits: HelpHit[];
  /** the terms actually searched (after any spelling fix), for highlighting */
  terms: string[];
  /** set when a misspelling was fixed: the words we searched instead */
  correctedTo: string | null;
};

/**
 * Search as typed first. Only if no answer contains every word do we try
 * fixing misspellings, so real words the docs don't use are never "fixed"
 * into something else while exact matches exist.
 */
export function searchHelpFull(
  sections: HelpSection[],
  q: string,
  limit = 12,
  /** only answers containing every word (site search, where other groups cover the rest) */
  strict = false
): HelpSearchResult {
  const terms = queryTerms(q);
  const asTyped = rankSections(sections, terms, limit);
  const partial = strict ? [] : asTyped.hits;
  if (asTyped.full || !terms.length) return { hits: asTyped.hits, terms, correctedTo: null };

  const fixed = correctTerms(terms, helpVocab(sections));
  if (!fixed.changed) return { hits: partial, terms, correctedTo: null };
  const retry = rankSections(sections, fixed.terms, limit);
  if (retry.full || (!strict && retry.hits.length > asTyped.hits.length)) {
    return { hits: retry.hits, terms: fixed.terms, correctedTo: describeFix(q, terms, fixed.terms) };
  }
  return { hits: partial, terms, correctedTo: null };
}

export function searchHelp(sections: HelpSection[], q: string, limit = 12): HelpHit[] {
  return searchHelpFull(sections, q, limit).hits;
}

export function highlightParts(text: string, terms: string[]): { t: string; hit: boolean }[] {
  if (!terms.length || !text) return [{ t: text, hit: false }];
  // A capturing split puts the matches at the odd indexes.
  const alts = terms.map((t) => (t.length <= 3 ? `${escapeRe(t)}\\b` : `${escapeRe(t)}[a-z]*`));
  const re = new RegExp(`(\\b(?:${alts.join("|")}))`, "i");
  return text
    .split(new RegExp(re.source, "gi"))
    .map((t, i) => ({ t, hit: i % 2 === 1 }))
    .filter((p) => p.t);
}
