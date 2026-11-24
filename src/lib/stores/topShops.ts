import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Top Stores, by calendar quarter (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec).
 *
 * The score (database function top_shops_between, migration 0090) mixes
 * reviews, customer actions (directions, call, website taps), page views,
 * followers and owner activity. While a quarter runs, the standings are
 * live; when it ends, the Top 100 is locked into top_shop_awards and that
 * is what the badges and the public leaderboard show.
 *
 * Shops are only ever shown publicly by tier: Top 25, Top 50 or Top 100.
 * Exact ranks stay in the admin.
 */
export type Tier = 25 | 50 | 100;

export type TopShopRow = {
  store_id: string;
  rank: number;
  score: number;
  views: number;
  actions: number;
  reviews: number;
  rating: number | null;
  followers: number;
  owner_activity: number;
};

export type AwardRow = TopShopRow & {
  quarter: string;
  /** Launch badges issued mid-quarter; replaced when the quarter locks in. */
  provisional: boolean;
  awarded_at: string;
  reward_sent_at: string | null;
  reward_note: string | null;
};

export function tierOf(rank: number): Tier | null {
  if (rank <= 25) return 25;
  if (rank <= 50) return 50;
  if (rank <= 100) return 100;
  return null;
}

/** "2026-Q4" for any date. */
export function quarterOf(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

/** The quarter before this one: "2026-Q1" → "2025-Q4". */
export function previousQuarter(q: string = quarterOf()): string {
  const [y, n] = q.split("-Q").map(Number);
  return n === 1 ? `${y - 1}-Q4` : `${y}-Q${n - 1}`;
}

/** First day of a quarter and first day of the next, as YYYY-MM-DD. */
export function quarterRange(q: string): { from: string; to: string } {
  const [y, n] = q.split("-Q").map(Number);
  const from = new Date(Date.UTC(y, (n - 1) * 3, 1));
  const to = new Date(Date.UTC(y, (n - 1) * 3 + 3, 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** "Q4 2026" for people. */
export function quarterLabel(q: string): string {
  const [y, n] = q.split("-Q");
  return `Q${n} ${y}`;
}

const num = (r: Record<string, unknown>): TopShopRow => ({
  store_id: String(r.store_id),
  rank: Number(r.rank),
  score: Number(r.score),
  views: Number(r.views ?? 0),
  actions: Number(r.actions ?? 0),
  reviews: Number(r.reviews ?? 0),
  rating: r.rating === null || r.rating === undefined ? null : Number(r.rating),
  followers: Number(r.followers ?? 0),
  owner_activity: Number(r.owner_activity ?? 0),
});

/** This quarter's standings so far. Refreshed every few hours. */
export const getLiveStandings = unstable_cache(
  async (): Promise<{ quarter: string; rows: TopShopRow[] }> => {
    const quarter = quarterOf();
    const { from } = quarterRange(quarter);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin.rpc("top_shops_between", { p_from: from, p_to: tomorrow, p_limit: 100 });
    if (error) {
      console.error("[top shops] live:", error.message);
      return { quarter, rows: [] };
    }
    return { quarter, rows: ((data ?? []) as Record<string, unknown>[]).map(num) };
  },
  ["top-shops-live-v1"],
  { revalidate: 6 * 60 * 60, tags: ["top-shops"] }
);

/** The most recent quarter that has been locked in, with its Top 100. */
export const getLatestAwards = unstable_cache(
  async (): Promise<{ quarter: string | null; rows: AwardRow[] }> => {
    const { data: last } = await supabaseAdmin
      .from("top_shop_awards")
      .select("quarter")
      .order("quarter", { ascending: false })
      .limit(1)
      .maybeSingle();
    const quarter = (last as { quarter: string } | null)?.quarter ?? null;
    if (!quarter) return { quarter: null, rows: [] };
    return { quarter, rows: await awardsFor(quarter) };
  },
  ["top-shops-awards-v1"],
  { revalidate: 60 * 60, tags: ["top-shops"] }
);

export async function awardsFor(quarter: string): Promise<AwardRow[]> {
  const { data } = await supabaseAdmin
    .from("top_shop_awards")
    .select("*")
    .eq("quarter", quarter)
    .order("rank", { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...num(r),
    quarter: String(r.quarter),
    provisional: Boolean(r.provisional),
    awarded_at: String(r.awarded_at),
    reward_sent_at: (r.reward_sent_at as string | null) ?? null,
    reward_note: (r.reward_note as string | null) ?? null,
  }));
}

/** Every quarter that has been locked in, newest first. */
export async function awardedQuarters(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("top_shop_awards").select("quarter").order("quarter", { ascending: false }).limit(2000);
  return [...new Set(((data ?? []) as { quarter: string }[]).map((r) => r.quarter))];
}

/**
 * The badge a shop wears: its tier in the latest issued set of awards (the
 * last locked-in quarter, or launch badges until the first one locks). It
 * holds until the next set replaces it, and a shop that drops out loses its
 * badge until it earns it back.
 */
export async function shopAward(storeId: string): Promise<{ tier: Tier; quarter: string } | null> {
  const { quarter, rows } = await getLatestAwards();
  if (!quarter) return null;
  const row = rows.find((r) => r.store_id === storeId);
  const tier = row ? tierOf(row.rank) : null;
  return tier ? { tier, quarter } : null;
}

/** Lock in a finished quarter. Running it twice does nothing the second time. */
export async function lockInQuarter(quarter: string): Promise<{ added: number; error?: string }> {
  const { data, error } = await supabaseAdmin.rpc("award_top_shops", { p_quarter: quarter, p_provisional: false });
  if (error) return { added: 0, error: error.message };
  revalidateTag("top-shops", { expire: 0 });
  return { added: Number(data ?? 0) };
}
