/**
 * Store directory search: forgiving about how people actually type.
 *
 * - Every word has to turn up, in any order: "aquarium depot" finds
 *   "Aquarium & Reptile Depot".
 * - "&" and "and" are the same, apostrophes don't count: "daves corals"
 *   finds "Dave's Corals".
 * - When nothing matches exactly, small typos are forgiven: "aquairum"
 *   finds "aquarium". Close matches are only used as a fallback, so a
 *   correctly spelled search is never cluttered with near misses.
 */

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function queryWords(query: string): string[] {
  const q = normalise(query);
  return q ? q.split(" ") : [];
}

export type Field = "name" | "place";
export type Token = { norm: string; field: Field };

export function tokenise(text: string, field: Field): Token[] {
  const n = normalise(text);
  return n ? n.split(" ").map((norm) => ({ norm, field })) : [];
}

/** How many typos a word of this length is allowed. */
function allowance(len: number): number {
  if (len >= 8) return 2;
  if (len >= 5) return 1;
  return 0;
}

/**
 * Edit distance with swapped neighbours counted as one mistake, so
 * "aquairum" is a single slip from "aquarium". Bails early once the
 * answer can't come in under the limit.
 */
export function withinDistance(a: string, b: string, limit: number): boolean {
  if (Math.abs(a.length - b.length) > limit) return false;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2][j - 2] + 1);
      }
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return false;
  }
  return d[a.length][b.length] <= limit;
}

/** Is this search word a near miss for this shop word? */
export function isClose(word: string, token: string): boolean {
  const limit = allowance(word.length);
  if (limit === 0) return false;
  // Whole word, or the start of it for someone still typing.
  return (
    withinDistance(word, token, limit) ||
    (token.length > word.length && withinDistance(word, token.slice(0, word.length), limit)) ||
    (token.length > word.length + 1 &&
      withinDistance(word, token.slice(0, word.length + 1), limit))
  );
}

/**
 * Lower is better. Null when some word can't be found at all.
 * A hit in the shop's name beats a hit in its city or state, and an
 * exact hit beats a forgiven typo.
 */
export function score(words: string[], tokens: Token[], allowClose: boolean): number | null {
  let total = 0;
  for (const w of words) {
    let best: number | null = null;
    for (const t of tokens) {
      let s: number | null = null;
      if (t.norm.includes(w)) s = t.field === "name" ? 0 : 1;
      else if (allowClose && isClose(w, t.norm)) s = t.field === "name" ? 2 : 3;
      if (s != null && (best == null || s < best)) best = s;
      if (best === 0) break;
    }
    if (best == null) return null;
    total += best;
  }
  return total;
}

export type Segment = { text: string; hit: boolean };

/**
 * Split a piece of display text into plain and highlighted runs, so the
 * card can show exactly which letters the search matched. An exact match
 * lights up just the matching letters; a forgiven typo lights up the whole
 * word it stood in for.
 */
export function highlight(text: string, words: string[], allowClose: boolean): Segment[] {
  if (!text || words.length === 0) return [{ text, hit: false }];
  const marks = new Array<boolean>(text.length).fill(false);
  const re = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const span = m[0];
    const start = m.index;
    const norm = normalise(span).replace(/ /g, "");
    const plain = !/['’]/.test(span);
    for (const w of words) {
      if (w.length < 2) continue;
      const at = norm.indexOf(w);
      if (at >= 0) {
        const [from, to] = plain ? [start + at, start + at + w.length] : [start, start + span.length];
        for (let i = from; i < to; i++) marks[i] = true;
      } else if (allowClose && isClose(w, norm)) {
        for (let i = start; i < start + span.length; i++) marks[i] = true;
      }
    }
  }
  const out: Segment[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1];
    if (last && last.hit === marks[i]) last.text += text[i];
    else out.push({ text: text[i], hit: marks[i] });
  }
  return out;
}
