/**
 * Trophies: types and grouping for the trophy cabinet. The database
 * decides who has earned what (public.sync_trophies); this only lays
 * the catalogue out.
 */

export type TrophyTier = "bronze" | "silver" | "gold" | "platinum";

export type TrophyRow = {
  key: string;
  name: string;
  description: string;
  category: string;
  scope: "site" | "society";
  series: string;
  tier: TrophyTier;
  threshold: number | null;
  exclusive: boolean;
  sort: number;
  earned_at: string | null;
  detail: string | null;
  /** Only filled in on your own case. */
  progress: number | null;
  is_member: boolean;
};

export type TrophySeries = {
  id: string;
  category: string;
  scope: "site" | "society";
  exclusive: boolean;
  steps: TrophyRow[];
  /** Highest earned step, or null. */
  top: TrophyRow | null;
  /** The next step still to earn, or null when complete. */
  next: TrophyRow | null;
  earnedCount: number;
};

export const CATEGORY_ORDER = [
  "classifieds",
  "forums",
  "feed",
  "tanks",
  "water",
  "knowledge",
  "learning",
  "events",
  "stores",
  "community",
  "referrals",
  "society_membership",
  "society_breeding",
  "society_service",
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  classifieds: "Classifieds",
  forums: "Forums",
  feed: "Feed",
  tanks: "Tanks",
  water: "Water Check",
  knowledge: "Library & Glossary",
  learning: "Courses",
  events: "Events",
  stores: "Fish Stores",
  community: "Community",
  referrals: "Referrals",
  society_membership: "Society · Membership",
  society_breeding: "Society · Breeding",
  society_service: "Society · Service",
};

export const TIER_STYLE: Record<TrophyTier, { ring: string; text: string; bg: string; label: string }> = {
  bronze: { ring: "border-orange-700/60", text: "text-orange-300", bg: "from-orange-700/25", label: "Bronze" },
  silver: { ring: "border-slate-300/50", text: "text-slate-200", bg: "from-slate-300/20", label: "Silver" },
  gold: { ring: "border-amber-400/60", text: "text-amber-300", bg: "from-amber-400/25", label: "Gold" },
  platinum: { ring: "border-cyan-200/60", text: "text-cyan-100", bg: "from-cyan-200/20", label: "Platinum" },
};

export function groupTrophies(rows: TrophyRow[]): TrophySeries[] {
  const bySeries = new Map<string, TrophyRow[]>();
  for (const r of rows) {
    const id = `${r.category}:${r.series}`;
    if (!bySeries.has(id)) bySeries.set(id, []);
    bySeries.get(id)!.push(r);
  }
  const out: TrophySeries[] = [];
  for (const [id, list] of bySeries) {
    const steps = list.slice().sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0) || a.sort - b.sort);
    const earned = steps.filter((s) => s.earned_at);
    const exclusive = steps.some((s) => s.exclusive);
    out.push({
      id,
      category: steps[0].category,
      scope: steps[0].scope,
      exclusive,
      steps,
      top: earned.length ? earned[earned.length - 1] : null,
      next: exclusive ? null : steps.find((s) => !s.earned_at) ?? null,
      earnedCount: exclusive ? Math.min(earned.length, 1) : earned.length,
    });
  }
  return out.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number]) -
        CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number]) ||
      a.steps[0].sort - b.steps[0].sort
  );
}

/**
 * Totals that make sense: an exclusive series (founding member number)
 * is one trophy, since nobody can ever hold more than one of it.
 */
export function trophyTotals(series: TrophySeries[]) {
  let total = 0;
  let earned = 0;
  for (const s of series) {
    total += s.exclusive ? 1 : s.steps.length;
    earned += s.earnedCount;
  }
  return { total, earned };
}
