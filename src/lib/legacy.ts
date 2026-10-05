import { supabasePublic } from "@/lib/supabase/public";
import { matchSpeciesSlug } from "@/lib/species/match";
import { GLOSSARY_ALIASES } from "@/lib/glossary/aliases";

/**
 * Old WordPress addresses Google still has indexed: blog posts at the top
 * level (/how-to-cycle-your-aquarium-without-losing-fish/), glossary entries
 * that were really species (/glossary/jewel-cichlid-hemichromis-bimaculatus/).
 * Each one carries whatever links and ranking the old page earned, so send it
 * to the closest page on the new site instead of a 404.
 */

// Posts we know about, matched by hand. Keys are the old slug with any
// emoji or punctuation stripped (see clean()).
const KNOWN: Record<string, string> = {
  "how-to-cycle-your-aquarium-without-losing-fish": "/glossary/cycling",
  "best-beginner-fish-how-to-choose-the-right-species-for-your-first-aquarium": "/glossary/beginner-fish",
  "bristlenose-pleco-vs-common-pleco": "/species/bristlenose-pleco",
  "community": "/forums",
};

// Words that say nothing about the topic.
const STOP = new Set([
  "a", "an", "and", "the", "to", "of", "for", "in", "on", "your", "you", "with", "without", "how", "what",
  "why", "is", "are", "my", "our", "guide", "care", "tips", "best", "vs", "from", "it", "do", "does",
  "aquarium", "aquariums", "tank", "tanks", "fish",
]);

function clean(slug: string): string {
  let s = slug;
  try {
    s = decodeURIComponent(slug);
  } catch {
    // leave as is
  }
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stem(w: string): string {
  return w.replace(/(ing|ed|es|s)$/, "");
}

function words(slug: string): string[] {
  return clean(slug)
    .split("-")
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

/** Share of the candidate's topic words that appear in the old slug. */
function overlap(oldWords: string[], candSlug: string): { score: number; hits: number; len: number } {
  const cand = words(candSlug);
  if (cand.length === 0) return { score: 0, hits: 0, len: 0 };
  const hits = cand.filter((c) => oldWords.includes(c)).length;
  return { score: hits / cand.length, hits, len: cand.length };
}

type Cand = { path: string; slug: string };

function best(oldWords: string[], cands: Cand[], minScore: number): string | null {
  let top: { path: string; score: number; hits: number; len: number } | null = null;
  for (const c of cands) {
    const o = overlap(oldWords, c.slug);
    if (o.hits === 0 || o.score < minScore) continue;
    if (
      !top ||
      o.score > top.score ||
      (o.score === top.score && o.hits > top.hits) ||
      (o.score === top.score && o.hits === top.hits && o.len < top.len)
    ) {
      top = { path: c.path, ...o };
    }
  }
  return top?.path ?? null;
}

async function glossaryCands(): Promise<Cand[]> {
  const { data } = await supabasePublic.from("glossary_terms").select("slug");
  return ((data ?? []) as { slug: string }[]).map((t) => ({ path: `/glossary/${t.slug}`, slug: t.slug }));
}

async function threadCands(): Promise<Cand[]> {
  const [{ data: cats }, { data: threads }] = await Promise.all([
    supabasePublic.from("forum_categories").select("id, slug").eq("is_public", true),
    supabasePublic.from("forum_threads").select("slug, category_id").is("hidden_at", null).limit(2000),
  ]);
  const catSlug = new Map(((cats ?? []) as { id: string; slug: string }[]).map((c) => [c.id, c.slug]));
  const out: Cand[] = [];
  for (const t of (threads ?? []) as { slug: string; category_id: string }[]) {
    const c = catSlug.get(t.category_id);
    if (c) out.push({ path: `/forums/${c}/${t.slug}`, slug: t.slug });
  }
  return out;
}

/** Where an old top-level WordPress post should go now, or null for a real 404. */
export async function matchLegacyPost(slug: string): Promise<string | null> {
  const key = clean(slug);
  if (!key) return null;
  if (KNOWN[key]) return KNOWN[key];

  const oldWords = words(key);
  if (oldWords.length === 0) return null;

  // A forum thread with nearly the same title is the closest match: the old
  // posts were articles, and the forum is where articles live now.
  const thread = best(oldWords, await threadCands(), 0.8);
  if (thread) return thread;

  const species = await matchSpeciesSlug(key);
  if (species) return `/species/${species}`;

  return best(oldWords, await glossaryCands(), 0.99);
}

/** An old /glossary/<slug> that isn't a term any more: usually a species. */
export async function matchLegacyGlossary(slug: string): Promise<string | null> {
  const key = clean(slug);
  if (!key) return null;
  if (GLOSSARY_ALIASES[key]) return `/glossary/${GLOSSARY_ALIASES[key]}`;
  const species = await matchSpeciesSlug(key);
  if (species) return `/species/${species}`;
  const oldWords = words(key);
  if (oldWords.length === 0) return null;
  const term = best(oldWords, await glossaryCands(), 0.99);
  return term && term !== `/glossary/${key}` ? term : null;
}
