import {
  buildTank,
  isAggressive,
  isInvert,
  isPeaceful,
  isSemiAggressive,
  swimZone,
  type Species,
  type StockItem,
} from "@/lib/tankBuilder/engine";
import { byPopularity, popularityKey } from "@/lib/tankBuilder/popular";

export type StockPlan = {
  title: string;
  summary: string;
  items: StockItem[];
  stockingPct: number;
};

const MAX_PCT = 80;

function fresh(s: Species) {
  return /fresh/i.test(s.water_type ?? "");
}
function schools(s: Species) {
  return (s.min_group_size ?? 0) >= 5 || /school|shoal/i.test(s.social ?? "");
}
function groupQty(s: Species) {
  return Math.max(1, s.min_group_size ?? (schools(s) ? 6 : 1));
}

/** True when the build has nothing worse than a note and isn't too full. */
function clean(gallons: number, items: StockItem[]) {
  const r = buildTank(gallons, items);
  return r.stocking.pct <= MAX_PCT && !r.issues.some((i) => i.level !== "note");
}

/**
 * Ready-made stocking plans for a tank size, built from the species database
 * and checked by the same engine the Tank Builder uses, so every plan on a
 * size page is one the tool itself calls a clean build.
 */
export function stockPlans(gallons: number, all: Species[], count = 3): StockPlan[] {
  const usable = all
    .filter(
      (s) =>
        fresh(s) &&
        s.temp_min_f != null &&
        s.temp_max_f != null &&
        s.max_size_in != null &&
        s.min_tank_gal != null &&
        s.min_tank_gal <= gallons &&
        !/not recommended|expert|advanced/i.test(s.suitability ?? "") &&
        // Goldfish and rift-lake cichlids need tanks built around them, not a community mix.
        !/goldfish|coldwater|rift lake/i.test(s.group_name ?? "")
    )
    // Big tanks lead with fish that actually use the space; small tanks with the classics.
    .sort((a, b) => {
      if (gallons >= 55) {
        const fitA = (a.min_tank_gal ?? 0) >= gallons * 0.25 ? 0 : 1;
        const fitB = (b.min_tank_gal ?? 0) >= gallons * 0.25 ? 0 : 1;
        if (fitA !== fitB) return fitA - fitB;
      }
      return byPopularity(a, b);
    });

  const schoolers = usable.filter(
    (s) => !isInvert(s) && schools(s) && isPeaceful(s) && swimZone(s) !== "bottom"
  );
  const bottoms = usable.filter((s) => !isInvert(s) && swimZone(s) === "bottom" && !isAggressive(s));
  const centers = usable.filter(
    (s) => !isInvert(s) && !schools(s) && (s.max_size_in ?? 0) >= 2 && swimZone(s) !== "bottom"
  );
  const inverts = usable.filter((s) => isInvert(s) && /shrimp|snail/i.test(`${s.group_name} ${s.common_name}`) && !/assassin/i.test(s.common_name));

  // Tracked by kind of fish, so "Neon Tetra" and "Black Neon Tetra" count as one.
  const used = new Set<string>();
  const plans: StockPlan[] = [];

  // Supporting fish already used in an earlier plan: tried last, so each plan
  // gets its own cast when the database has enough options.
  const seenSupport = new Set<string>();

  // Try to add the first candidate from a role list that keeps the build clean.
  function tryAdd(items: StockItem[], pool: Species[], qty?: (s: Species) => number): Species | null {
    for (const pass of [0, 1]) {
      let tries = 0;
      for (const s of pool) {
        const key = popularityKey(s);
        if (used.has(key) || items.some((i) => popularityKey(i.species) === key)) continue;
        if (pass === 0 && seenSupport.has(key)) continue;
        if (++tries > 12) break;
        const q = qty ? qty(s) : groupQty(s);
        const next = [...items, { species: s, qty: q }];
        if (clean(gallons, next)) {
          items.push({ species: s, qty: q });
          return s;
        }
      }
    }
    return null;
  }

  for (let p = 0; p < count; p++) {
    const items: StockItem[] = [];
    // Tiny tanks: a single centerpiece fish leads. Bigger tanks: a school.
    const lead =
      gallons < 10
        ? tryAdd(items, centers, () => 1) ?? tryAdd(items, schoolers)
        : tryAdd(items, schoolers) ?? tryAdd(items, centers, () => 1);
    if (!lead && gallons >= 10) break;
    if (gallons >= 10) tryAdd(items, bottoms);
    if (gallons >= 20 && lead && schools(lead)) tryAdd(items, centers, (s) => (isSemiAggressive(s) ? 1 : groupQty(s)));
    if (gallons >= 40) tryAdd(items, schoolers);
    if (gallons >= 75) tryAdd(items, centers, (s) => (isSemiAggressive(s) ? 1 : groupQty(s)));
    tryAdd(items, inverts, (s) => (/snail/i.test(s.common_name) ? 1 : Math.max(3, groupQty(s))));
    if (items.length === 0) break;
    // A lone snail isn't a stocking plan.
    if (/snail/i.test(`${items[0].species.group_name} ${items[0].species.common_name}`)) break;

    // Grow the schools while there's room, up to double their minimum.
    for (const it of items) {
      if (!schools(it.species)) continue;
      const cap = groupQty(it.species) * (gallons > 60 ? 3 : 2);
      while (it.qty < cap) {
        it.qty += 1;
        if (!clean(gallons, items) || buildTank(gallons, items).stocking.pct > 70) {
          it.qty -= 1;
          break;
        }
      }
    }

    // Only the lead fish is retired, so later plans get a new star but can
    // still reuse good supporting fish like corys and snails.
    used.add(popularityKey(items[0].species));
    for (const it of items.slice(1)) seenSupport.add(popularityKey(it.species));
    const r = buildTank(gallons, items);
    const leadName = items[0].species.common_name;
    plans.push({
      title: isInvert(items[0].species)
        ? `${leadName} colony`
        : schools(items[0].species)
        ? `${leadName} community`
        : `${leadName} centerpiece`,
      summary: items.map((i) => `${i.qty} ${i.species.common_name}`).join(", "),
      items,
      stockingPct: r.stocking.pct,
    });
  }
  return plans;
}

/** Popular fish that fit this size, and popular ones that need something bigger. */
export function fitLists(gallons: number, all: Species[]) {
  const withMin = all.filter((s) => s.min_tank_gal != null && fresh(s));
  const fits = withMin
    .filter((s) => (s.min_tank_gal as number) <= gallons)
    .sort(byPopularity)
    .slice(0, 24);
  const tooBig = withMin
    .filter((s) => (s.min_tank_gal as number) > gallons)
    .sort(byPopularity)
    .slice(0, 8);
  return { fits, tooBig };
}
