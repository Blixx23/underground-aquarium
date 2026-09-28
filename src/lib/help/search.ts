import type { HelpSection } from "./types";

/**
 * Plain keyword search over help sections. Runs in the browser in well under
 * a millisecond for a few hundred sections, so it costs nothing to run.
 *
 * People type questions ("how do I mark my listing sold"), so filler words
 * are dropped and simple plurals/verb endings are folded ("listings" finds
 * "listing", "posted" finds "post").
 */

const STOP = new Set(
  "a an and are as at be can do does for from get how i if in is it me my of on or so the to up we what when where which who why will with you your".split(" ")
);

export function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es") && !w.endsWith("ses")) return w.slice(0, -1);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function queryTerms(q: string): string[] {
  const words = q
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter(Boolean);
  const kept = words.filter((w) => !STOP.has(w));
  return (kept.length ? kept : words).map(stem);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type HelpHit = { s: HelpSection; score: number; snippet: string };

function termScore(term: string, heading: string, article: string, keywords: string, text: string): number {
  // Short terms ("ph", "gh", "kh", "co2") must match a whole word, or "ph" finds "photo".
  const wordStart = new RegExp(term.length <= 3 ? `\\b${escapeRe(term)}\\b` : `\\b${escapeRe(term)}`);
  if (wordStart.test(heading)) return 30;
  if (heading.includes(term)) return 22;
  if (wordStart.test(keywords)) return 18;
  if (wordStart.test(article)) return 16;
  if (wordStart.test(text)) return 10;
  if (text.includes(term)) return 5;
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
export function searchHelp(sections: HelpSection[], q: string, limit = 12): HelpHit[] {
  const terms = queryTerms(q);
  if (!terms.length) return [];
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
  return pool.slice(0, limit).map(({ s, score, snippet }) => ({ s, score, snippet }));
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
