import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * After a shop has had the whole sequence, it only hears from us again when
 * something real happened on its page. Right now that means a new review:
 * true, checkable in two seconds, and the best reason an owner has to claim
 * (so they can reply). No news, no email.
 */

export type ReviewNews = { count: number; average: number | null; latest: number | null };

/** New reviews per shop since each one's last email. */
export async function reviewsSince(
  wants: { storeId: string; since: string }[]
): Promise<Map<string, ReviewNews>> {
  const out = new Map<string, ReviewNews>();
  if (wants.length === 0) return out;
  const earliest = new Date(Math.min(...wants.map((w) => Date.parse(w.since)))).toISOString();
  const sinceBy = new Map(wants.map((w) => [w.storeId, w.since]));

  const { data, error } = await supabaseAdmin
    .from("store_reviews")
    .select("store_id, rating, created_at")
    .in("store_id", [...sinceBy.keys()])
    .gt("created_at", earliest)
    .order("created_at", { ascending: false });
  if (error) {
    // Unsure means quiet: better to skip a week than mail a shop by mistake.
    console.error("[campaign news]", error.message);
    return out;
  }

  const acc = new Map<string, { count: number; sum: number; rated: number; latest: number | null }>();
  // Newest first, so the first rating seen per shop is the latest one.
  for (const r of (data ?? []) as { store_id: string; rating: number | null; created_at: string }[]) {
    const since = sinceBy.get(r.store_id);
    if (!since || Date.parse(r.created_at) <= Date.parse(since)) continue;
    const a = acc.get(r.store_id) ?? { count: 0, sum: 0, rated: 0, latest: null };
    a.count++;
    if (r.rating != null) {
      if (a.latest === null) a.latest = r.rating;
      a.sum += r.rating;
      a.rated++;
    }
    acc.set(r.store_id, a);
  }
  for (const [id, a] of acc) {
    out.set(id, { count: a.count, latest: a.latest, average: a.rated ? Math.round((a.sum / a.rated) * 10) / 10 : null });
  }
  return out;
}

/** The news email, as plain campaign text with the usual {{tokens}}. */
export function newsEmail(n: ReviewNews): { subject: string; body: string } {
  const one = n.count === 1;
  const subject = one
    ? "{{shop_name}} got a new review on Underground Aquarium"
    : `{{shop_name}} got ${n.count} new reviews on Underground Aquarium`;

  const what = one
    ? n.latest != null
      ? `A customer left a ${n.latest} star review of {{shop_name}} on your Underground Aquarium page.`
      : "A customer reviewed {{shop_name}} on your Underground Aquarium page."
    : n.average != null
    ? `${n.count} customers have reviewed {{shop_name}} on your Underground Aquarium page since I last wrote. They average ${n.average} out of 5.`
    : `${n.count} customers have reviewed {{shop_name}} on your Underground Aquarium page since I last wrote.`;

  // The news leads, so it's also the line the inbox shows.
  const body = `Hi,

${what}

You can read ${one ? "it" : "them"} here: {{page_url}}

Owners who claim their page can reply to reviews in their own words, and keep their hours and photos right. It's free and takes one click: {{claim_link}}

Chris Lewis
Underground Aquarium`;

  return { subject, body };
}
