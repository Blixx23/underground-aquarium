import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ShopFacts = {
  store_id: string;
  views_30: number;
  reviews_total: number;
  reviews_30: number;
  rating: number | null;
  photos: number;
  sightings_30: number;
  posts_total: number;
  has_hours: boolean;
  has_photo: boolean;
  has_about: boolean;
  nearby_claimed: number;
};

const EMPTY = (id: string): ShopFacts => ({
  store_id: id, views_30: 0, reviews_total: 0, reviews_30: 0, rating: null,
  photos: 0, sightings_30: 0, posts_total: 0,
  has_hours: false, has_photo: false, has_about: false, nearby_claimed: 0,
});

/** Facts for a batch of shops. A database without the function yields zeroes. */
export async function factsFor(ids: string[]): Promise<Map<string, ShopFacts>> {
  const out = new Map<string, ShopFacts>();
  for (const id of ids) out.set(id, EMPTY(id));
  if (ids.length === 0) return out;
  try {
    const { data, error } = await supabaseAdmin.rpc("store_outreach_facts", { p_ids: ids });
    if (error) {
      console.error("[campaign facts] falling back to nothing:", error.message);
      return out;
    }
    for (const row of (data ?? []) as ShopFacts[]) out.set(row.store_id, row);
  } catch (e) {
    console.error("[campaign facts]", e instanceof Error ? e.message : e);
  }
  return out;
}

/**
 * The sentence the email leads with.
 *
 * The rule is that it has to be TRUE and CHECKABLE in about two seconds,
 * because that is the only thing separating this from the listing spam
 * every shop owner already deletes. Where there is nothing true and
 * interesting to say, it says something plain rather than inventing
 * urgency.
 */
export function whatsHappening(f: ShopFacts, shop: string): string {
  if (f.views_30 >= 10) {
    return `${f.views_30} people opened your page on Underground Aquarium in the last month.`;
  }
  if (f.reviews_30 > 0) {
    return f.reviews_30 === 1
      ? `Somebody reviewed ${shop} on Underground Aquarium in the last month.`
      : `${f.reviews_30} people reviewed ${shop} on Underground Aquarium in the last month.`;
  }
  if (f.sightings_30 > 0) {
    return f.sightings_30 === 1
      ? `Somebody posted what they spotted on your shelves this month.`
      : `${f.sightings_30} people posted what they spotted on your shelves this month.`;
  }
  if (f.reviews_total > 0) {
    const stars = f.rating ? ` It averages ${f.rating} out of 5.` : "";
    return `${shop} has ${f.reviews_total} review${f.reviews_total === 1 ? "" : "s"} on Underground Aquarium.${stars}`;
  }
  if (f.views_30 > 0) {
    return `People are starting to find ${shop} on Underground Aquarium.`;
  }
  if (f.nearby_claimed > 0) {
    return `${f.nearby_claimed} shop${f.nearby_claimed === 1 ? "" : "s"} near you ${
      f.nearby_claimed === 1 ? "has" : "have"
    } already taken over their page on Underground Aquarium.`;
  }
  return `${shop} has a free page on Underground Aquarium.`;
}

/** What is visibly wrong or thin on their page right now. */
export function whatsMissing(f: ShopFacts): string {
  const gaps: string[] = [];
  if (!f.has_hours) gaps.push("your hours aren't on it");
  if (!f.has_photo) gaps.push("there are no photos");
  if (!f.has_about) gaps.push("there's nothing written about the shop");

  if (gaps.length === 0) return "";
  if (gaps.length === 1) return `Right now ${gaps[0]}, because I built the page from public listings and that's all I had.`;
  const last = gaps.pop() as string;
  return `Right now ${gaps.join(", ")} and ${last}, because I built the page from public listings and that's all I had.`;
}

/** The subject line, chosen the same way. Always something real. */
export function subjectHook(f: ShopFacts, shop: string): string {
  if (f.views_30 >= 10) return `${f.views_30} people looked up ${shop} last month`;
  if (f.reviews_30 > 0) return `A new review on your ${shop} page`;
  if (f.sightings_30 > 0) return `Someone posted what they saw at ${shop}`;
  if (f.reviews_total > 0) return `Your ${shop} reviews on Underground Aquarium`;
  if (!f.has_hours) return `${shop} is listed without its hours`;
  return `Your ${shop} page on Underground Aquarium`;
}
