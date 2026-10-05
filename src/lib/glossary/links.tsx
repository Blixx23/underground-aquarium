import "server-only";
import Link from "next/link";
import type { ReactNode } from "react";
import { supabasePublic } from "@/lib/supabase/public";

/**
 * Turns glossary words in our own text ("ammonia", "sponge filter") into
 * links to their glossary page. Only the first mention of each term on a
 * page links, and only a handful per page, so it reads like a helpful
 * reference and not a wall of underlines. Internal links like these are also
 * how search engines learn the glossary pages matter.
 */

type Entry = { slug: string; phrase: string };

// Words too everyday to be worth a link wherever they appear.
const SKIP = new Set([
  "hardy", "stress", "strain", "gallon", "melt", "top-off", "top off", "evaporation", "lighting", "pellet",
  "doa", "lfs", "mts", "sexing", "conditioning", "culling", "spawn", "invertebrate", "fasting day",
  "freshwater", "carnivore", "herbivore", "omnivore", "fry", "nocturnal", "territorial", "fungus", "algae",
  "heater", "thermometer", "substrate", "saltwater", "hardscape", "stocking", "bioload",
]);

let cached: { at: number; list: Promise<Entry[]> } | null = null;

/** Every linkable phrase, longest first so "sponge filter" wins over "filter". */
export function loadGlossaryPhrases(): Promise<Entry[]> {
  if (!cached || Date.now() - cached.at > 10 * 60_000) {
    const list = (async () => {
      const { data } = await supabasePublic.from("glossary_terms").select("slug, term");
      const out: Entry[] = [];
      for (const r of (data ?? []) as { slug: string; term: string }[]) {
        // "Seed Shrimp (Ostracods)" links on both names; "Quarantine (QT)" on the first.
        const m = r.term.match(/^(.*?)\s*\((.+)\)\s*$/);
        const names = m ? [m[1], m[2]] : [r.term];
        for (const n of names) {
          const phrase = n.trim();
          if (phrase.length < 2 || SKIP.has(phrase.toLowerCase())) continue;
          // Two-letter words only when they're codes (pH, KH, GH).
          if (phrase.length < 3 && !isCode(phrase)) continue;
          out.push({ slug: r.slug, phrase });
        }
      }
      if (out.length === 0) cached = null; // don't hold on to a failed load
      const have = new Set(out.map((e) => e.phrase.toLowerCase()));
      for (const e of EXTRA) if (!have.has(e.phrase)) out.push(e);
      return out.sort((a, b) => b.phrase.length - a.phrase.length);
    })();
    cached = { at: Date.now(), list };
  }
  return cached.list;
}

/** pH, KH, GH, CO2, TDS: matched with exact case so "ph" in "graph" never links. */
const isCode = (s: string) => s.length <= 4 && (/\d/.test(s) || /[A-Z]/.test(s.slice(1)));

// Other names that should link to a term's page (merged duplicates and
// common alternatives). The glossary's own names win if they overlap.
const EXTRA: Entry[] = [
  { slug: "beneficial-bacteria", phrase: "nitrifying bacteria" },
  { slug: "quarantine", phrase: "quarantine tank" },
  { slug: "water-change", phrase: "partial water change" },
  { slug: "acclimation", phrase: "acclimate" },
  { slug: "ich", phrase: "white spot" },
  { slug: "fin-rot", phrase: "tail rot" },
  { slug: "cyanobacteria", phrase: "blue-green algae" },
  { slug: "dechlorinator", phrase: "water conditioner" },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type GlossaryLinker = {
  /** The text with its first glossary mentions linked. */
  link: (text: string | null | undefined) => ReactNode;
};

/**
 * One linker per page: it remembers what it already linked so each term
 * links once. `self` is the page's own term, which never links to itself.
 */
export async function glossaryLinker(opts: { self?: string; max?: number } = {}): Promise<GlossaryLinker> {
  const entries = await loadGlossaryPhrases();
  const max = opts.max ?? 10;
  const used = new Set<string>(opts.self ? [opts.self] : []);
  let count = 0;
  const bySlugPhrase = new Map(entries.map((e) => [e.phrase.toLowerCase(), e.slug]));
  // Case-sensitive for short codes (pH, KH) so "gh" inside words or "ph" in
  // "graph" never match; everything else is case-insensitive with an optional plural.
  const codes = entries.filter((e) => isCode(e.phrase));
  const words = entries.filter((e) => !isCode(e.phrase));
  const parts = [
    ...words.map((e) => `(?:${esc(e.phrase)}(?:s|es)?)`),
  ];
  const wordRe = parts.length ? new RegExp(`\\b(?:${parts.join("|")})\\b`, "gi") : null;
  const codeRe = codes.length ? new RegExp(`\\b(?:${codes.map((e) => esc(e.phrase)).join("|")})\\b`, "g") : null;

  function slugFor(match: string): string | null {
    const low = match.toLowerCase();
    return bySlugPhrase.get(low) ?? bySlugPhrase.get(low.replace(/es$/, "")) ?? bySlugPhrase.get(low.replace(/s$/, "")) ?? null;
  }

  function link(text: string | null | undefined): ReactNode {
    if (!text) return text ?? null;
    if (count >= max || (!wordRe && !codeRe)) return text;
    // Gather matches from both patterns, earliest first, no overlaps.
    const hits: { start: number; end: number; slug: string; text: string }[] = [];
    for (const re of [wordRe, codeRe]) {
      if (!re) continue;
      re.lastIndex = 0;
      for (let m = re.exec(text); m; m = re.exec(text)) {
        const slug = slugFor(m[0]);
        if (slug) hits.push({ start: m.index, end: m.index + m[0].length, slug, text: m[0] });
      }
    }
    hits.sort((a, b) => a.start - b.start || b.end - a.end);
    const out: ReactNode[] = [];
    let at = 0;
    for (const h of hits) {
      if (h.start < at || used.has(h.slug) || count >= max) continue;
      used.add(h.slug);
      count++;
      if (h.start > at) out.push(text.slice(at, h.start));
      out.push(
        <Link
          key={`${h.slug}-${h.start}`}
          href={`/glossary/${h.slug}`}
          className="text-emerald-300 underline decoration-emerald-500/30 underline-offset-2 hover:text-emerald-200"
        >
          {h.text}
        </Link>
      );
      at = h.end;
    }
    if (out.length === 0) return text;
    if (at < text.length) out.push(text.slice(at));
    return <>{out}</>;
  }

  return { link };
}
