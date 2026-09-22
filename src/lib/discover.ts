import { supabasePublic } from "@/lib/supabase/public";
import { LISTING_COLUMNS, type Listing } from "@/lib/marketplace/listings";

/**
 * Small lookups that give a page a "next click": guides and listings that
 * match what the reader is already looking at.
 */

const STOP = new Set(
  "the and for with your you are how why what when does did can not from that this into out about have has its it's their them they there then than tank tanks fish aquarium aquariums vs versus best good new first after before over under just more most help need".split(
    " "
  )
);

/** Meaningful words from a title, for matching related guides. */
export function keywords(text: string, max = 5): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
  return [...new Set(words)].slice(0, max);
}

export type GuideLink = { id: string; title: string; href: string; replies: number; score: number };

/**
 * Forum threads whose titles share words with `terms`, best overlap first.
 * Falls back to the newest guides in `fallbackCategoryId` when nothing matches.
 */
export async function relatedThreads({
  terms,
  excludeId,
  fallbackCategoryId,
  limit = 4,
}: {
  terms: string[];
  excludeId?: string;
  fallbackCategoryId?: string;
  limit?: number;
}): Promise<GuideLink[]> {
  const [{ data: cats }] = await Promise.all([
    supabasePublic.from("forum_categories").select("id, slug").eq("is_public", true),
  ]);
  const slugById = new Map(((cats ?? []) as { id: string; slug: string }[]).map((c) => [c.id, c.slug]));

  type Row = { id: string; slug: string; title: string; category_id: string; reply_count: number | null };
  const clean = terms.map((t) => t.replace(/[^a-zA-Z0-9 -]/g, "").trim()).filter(Boolean);
  let rows: Row[] = [];
  if (clean.length) {
    const { data } = await supabasePublic
      .from("forum_threads")
      .select("id, slug, title, category_id, reply_count")
      .or(clean.map((t) => `title.ilike.%${t}%`).join(","))
      .limit(40);
    rows = (data ?? []) as Row[];
  }
  const scored = rows
    .filter((r) => r.id !== excludeId && slugById.has(r.category_id))
    .map((r) => {
      const t = r.title.toLowerCase();
      return { r, score: clean.reduce((n, w) => n + (t.includes(w.toLowerCase()) ? 1 : 0), 0) };
    })
    .sort((a, b) => b.score - a.score || (b.r.reply_count ?? 0) - (a.r.reply_count ?? 0));

  const picked = scored.slice(0, limit);
  if (picked.length < limit && fallbackCategoryId) {
    const have = new Set([excludeId, ...picked.map((p) => p.r.id)]);
    const { data } = await supabasePublic
      .from("forum_threads")
      .select("id, slug, title, category_id, reply_count")
      .eq("category_id", fallbackCategoryId)
      .order("last_activity_at", { ascending: false })
      .limit(limit + 4);
    for (const r of (data ?? []) as Row[]) {
      if (picked.length >= limit) break;
      if (have.has(r.id) || !slugById.has(r.category_id)) continue;
      picked.push({ r, score: 0 });
      have.add(r.id);
    }
  }
  return picked.map(({ r, score }) => ({
    id: r.id,
    title: r.title,
    href: `/forums/${slugById.get(r.category_id)}/${r.slug}`,
    replies: r.reply_count ?? 0,
    score,
  }));
}

/** Live classified ads whose titles mention any of `names`. */
export async function listingsMatching(names: string[], limit = 4): Promise<Listing[]> {
  const clean = names.map((n) => n.replace(/[^a-zA-Z0-9 -]/g, "").trim()).filter((n) => n.length >= 3);
  if (!clean.length) return [];
  const { data } = await supabasePublic
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .or(clean.map((n) => `title.ilike.%${n}%`).join(","))
    .order("bumped_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as Listing[];
}
