import { supabasePublic } from "@/lib/supabase/public";

/**
 * Old species links (from the WordPress site, or before a species was
 * renamed) still get crawled: /fish/zebra-danio-danio-rerio/,
 * /species/mexican-dwarf-crayfish, /species/endler-s-livebearer. Rather than
 * 404, find the species they meant and send them there for good.
 *
 * A candidate wins when most of ITS words appear in the old slug (so
 * "kribensis" matches "kribensis-cichlid-pelvicachromis-pulcher") and words
 * can differ by a trailing letter or two ("endler"/"endlers",
 * "boeseman"/"boesemani").
 */
function words(slug: string): string[] {
  return slug
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

function same(a: string, b: string): boolean {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 4 && l.startsWith(s) && l.length - s.length <= 2;
}

export async function matchSpeciesSlug(oldSlug: string): Promise<string | null> {
  const old = words(decodeURIComponent(oldSlug));
  if (old.length === 0) return null;

  const { data } = await supabasePublic.from("species").select("slug");
  let best: { slug: string; score: number; hits: number; len: number } | null = null;
  for (const row of (data ?? []) as { slug: string }[]) {
    const cand = words(row.slug);
    if (cand.length === 0) continue;
    const hits = cand.filter((c) => old.some((o) => same(o, c))).length;
    const score = hits / cand.length;
    if (score < 0.66 || hits === 0) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && hits > best.hits) ||
      (score === best.score && hits === best.hits && cand.length < best.len)
    ) {
      best = { slug: row.slug, score, hits, len: cand.length };
    }
  }
  return best && best.slug !== oldSlug ? best.slug : null;
}
