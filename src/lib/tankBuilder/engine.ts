import { popularityRank } from "@/lib/tankBuilder/popular";

export type Species = {
  slug: string;
  common_name: string;
  scientific_name: string | null;
  group_name: string | null;
  water_type: string | null;
  temp_min_f: number | null;
  temp_max_f: number | null;
  ph_min: number | null;
  ph_max: number | null;
  gh_min: number | null;
  gh_max: number | null;
  max_size_in: number | null;
  min_tank_gal: number | null;
  temperament: string | null;
  social: string | null;
  min_group_size: number | null;
  swim_level: string | null;
  diet: string | null;
  fin_nipper: boolean | null;
  suitability: string | null;
};

export type StockItem = { species: Species; qty: number };

export type Issue = {
  level: "conflict" | "caution" | "note";
  title: string;
  detail: string;
  /** Species the issue is about, so the list can mark them. */
  slugs?: string[];
};

export type Equipment = {
  heaterWattsLow: number;
  heaterWattsHigh: number;
  filterGphLow: number;
  filterGphHigh: number;
  heaterNote: string | null;
  /** False when every fish is happy at room temperature (goldfish, WCMM...). */
  heaterNeeded: boolean;
  /** Where to set the heater: the middle of the range everyone shares. */
  setPointF: number | null;
};

export type Stocking = {
  pct: number;
  level: "ok" | "near" | "over";
  label: string;
  reasoning: string;
};

export type Range = { lo: number; hi: number } | null;

export type SharedWater = {
  temp: Range;
  ph: Range;
  gh: Range;
};

export type BuildResult = {
  equipment: Equipment;
  stocking: Stocking;
  issues: Issue[];
  water: SharedWater;
  /** 0-100, a quick read of how well the whole build fits together. */
  score: number;
};

const MESSY_GROUPS = new Set([
  "Goldfish & Coldwater",
  "Cichlids - New World",
  "Cichlids - African Rift Lake",
  "Plecos (L-number Catfish)",
  "Other Catfish",
  "Oddballs & Specialty",
]);
const LIGHT_GROUPS = new Set(["Shrimp", "Snails"]);
const INVERT_GROUPS = new Set(["Shrimp", "Snails", "Crabs", "Crayfish", "Invertebrates"]);

// ---------------------------------------------------------------------------
// TUNING KNOBS: turn these to make the whole tool warmer or stricter.
//
// Tank size vs. a species' recommended minimum (gallons / min_tank_gal):
//   ratio >= 1.0                     -> no flag at all
//   TANK_TIP_RATIO .. 1.0            -> gentle "note" (NOT counted as a problem)
//   TANK_TIGHT_RATIO .. TANK_TIP     -> "caution" (amber, workable but tight)
//   below TANK_TIGHT_RATIO           -> "conflict" (red, genuinely too small)
const TANK_TIP_RATIO = 0.5;
const TANK_TIGHT_RATIO = 0.4;

// Stocking: % of a deliberately conservative ceiling before we flag it.
const STOCK_OVER_PCT = 130;
const STOCK_NEAR_PCT = 90;
// ---------------------------------------------------------------------------

/** 231 cubic inches in a US gallon. */
export const CUBIC_IN_PER_GAL = 231;
export const LITERS_PER_GAL = 3.78541;

/** Gallons from inside dimensions in inches. */
export function gallonsFromInches(length: number, width: number, height: number): number {
  if (!(length > 0 && width > 0 && height > 0)) return 0;
  return (length * width * height) / CUBIC_IN_PER_GAL;
}

export function galToL(g: number): number {
  return g * LITERS_PER_GAL;
}
export function lToGal(l: number): number {
  return l / LITERS_PER_GAL;
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function isInvert(s: Species): boolean {
  return INVERT_GROUPS.has(s.group_name ?? "") || /shrimp|snail|crab|crayfish/i.test(s.group_name ?? "");
}

export function isAggressive(s: Species): boolean {
  const t = norm(s.temperament);
  return /aggress|territor|predat/.test(t) && !/semi/.test(t);
}
export function isSemiAggressive(s: Species): boolean {
  return /semi/.test(norm(s.temperament));
}
export function isPeaceful(s: Species): boolean {
  const t = norm(s.temperament);
  return /peace|docile|calm|community/.test(t) && !/aggress/.test(t);
}
function isPredator(s: Species): boolean {
  return /carniv|pisciv|predat/.test(norm(s.diet)) || /predat/.test(norm(s.temperament));
}

/** Slow, long-finned fish that nippers go for. */
const LONG_FIN =
  /betta|angelfish|\bangel\b|guppy|gourami|fancy goldfish|oranda|ryukin|veil|long ?fin|lionhead|telescope|fantail|siamese fighting/i;

/** Which layer of the tank a fish lives in. */
export function swimZone(s: Species): "top" | "mid" | "bottom" | "all" {
  const z = norm(s.swim_level);
  if (/all|any|every/.test(z)) return "all";
  if (/bottom|substrate|floor/.test(z)) return "bottom";
  if (/top|surface/.test(z)) return "top";
  if (/mid|middle/.test(z)) return "mid";
  if (isInvert(s)) return "bottom";
  return "mid";
}

function wasteFactor(s: Species): number {
  const g = s.group_name ?? "";
  if (LIGHT_GROUPS.has(g) || isInvert(s)) return 0.3;
  if (MESSY_GROUPS.has(g)) return 1.6;
  return 1.0;
}

export function computeStocking(gallons: number, stock: StockItem[]): Stocking {
  let load = 0;
  for (const { species, qty } of stock) {
    const size = species.max_size_in && species.max_size_in > 0 ? species.max_size_in : 1;
    load += size * wasteFactor(species) * Math.max(0, qty);
  }
  // Conservative ceiling: ~1.5 waste-adjusted adult-inches of fish per gallon.
  const capacity = gallons * 1.5;
  const pct = capacity > 0 ? Math.round((load / capacity) * 100) : 0;

  let level: Stocking["level"] = "ok";
  let label = "Comfortably stocked";
  if (pct > STOCK_OVER_PCT) {
    level = "over";
    label = "Overstocked";
  } else if (pct >= STOCK_NEAR_PCT) {
    level = "near";
    label = "Near capacity";
  } else if (pct < 35) {
    label = "Lightly stocked";
  }

  const reasoning =
    "Worked out from the adult size and waste output of your fish against a deliberately cautious limit. Treat it as a guide: strong filtration and regular water changes give you more headroom.";

  return { pct, level, label, reasoning };
}

/** The part of every species' range they all share, or null if they don't. */
function overlap(list: Species[], lo: (s: Species) => number | null, hi: (s: Species) => number | null): {
  range: Range;
  known: Species[];
} {
  const known = list.filter((s) => lo(s) != null && hi(s) != null);
  if (known.length === 0) return { range: null, known };
  const l = Math.max(...known.map((s) => lo(s) as number));
  const h = Math.min(...known.map((s) => hi(s) as number));
  return { range: l <= h ? { lo: l, hi: h } : null, known };
}

/**
 * When ranges don't overlap, find the fish whose removal would fix it, so the
 * message can name the odd one out instead of just saying "they differ".
 */
function oddOneOut(
  known: Species[],
  lo: (s: Species) => number | null,
  hi: (s: Species) => number | null
): Species | null {
  if (known.length < 3) return null;
  for (const s of known) {
    const rest = known.filter((x) => x !== s);
    if (overlap(rest, lo, hi).range) return s;
  }
  return null;
}

export function computeEquipment(
  gallons: number,
  stockingPct: number,
  messy: boolean,
  temp: Range = null,
  coldwater = false
): Equipment {
  const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
  const heaterWattsLow = gallons > 0 ? round5(gallons * 3) : 0;
  const heaterWattsHigh = gallons > 0 ? round5(gallons * 5) : 0;

  const filterHighX = stockingPct >= STOCK_NEAR_PCT || messy ? 8 : 6;
  const filterGphLow = Math.round(gallons * 4);
  const filterGphHigh = Math.round(gallons * filterHighX);

  const setPointF = temp ? Math.round((temp.lo + temp.hi) / 2) : null;
  const heaterNeeded = !coldwater;

  let heaterNote: string | null = null;
  if (coldwater) {
    heaterNote =
      "Everything here is happy at room temperature, so you likely don't need a heater. Keep the tank away from windows and heat vents to hold the temperature steady.";
  } else if (gallons >= 75) {
    heaterNote =
      "For a tank this size, two smaller heaters (one at each end) heat more evenly, and if one sticks on or dies the other covers for it.";
  }

  return { heaterWattsLow, heaterWattsHigh, filterGphLow, filterGphHigh, heaterNote, heaterNeeded, setPointF };
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function buildTank(gallons: number, stock: StockItem[]): BuildResult {
  const issues: Issue[] = [];
  const g = Number.isFinite(gallons) && gallons > 0 ? gallons : 0;
  const species = stock.map((s) => s.species);
  const fish = species.filter((s) => !isInvert(s));

  // Tank size vs. the species' recommended minimum: graduated, not all-or-nothing.
  for (const { species: s } of stock) {
    if (s.min_tank_gal == null || g <= 0) continue;
    if (g >= s.min_tank_gal) continue;
    const ratio = g / s.min_tank_gal;
    const gal = Math.round(g * 10) / 10;
    if (ratio >= TANK_TIP_RATIO) {
      issues.push({
        level: "note",
        title: `${s.common_name} would like more room`,
        detail: `${s.min_tank_gal}+ gallons is the usual recommendation for ${s.common_name}. Your ${gal} can work, especially with strong filtration and regular maintenance, but plan to upgrade as they grow.`,
        slugs: [s.slug],
      });
    } else if (ratio >= TANK_TIGHT_RATIO) {
      issues.push({
        level: "caution",
        title: `${s.common_name} is tight in this tank`,
        detail: `${s.common_name} is usually kept in ${s.min_tank_gal}+ gallons, and ${gal} is on the small side. Fine short term or for a single fish, but a bigger tank should be the plan.`,
        slugs: [s.slug],
      });
    } else {
      issues.push({
        level: "conflict",
        title: `${s.common_name} needs a much bigger tank`,
        detail: `${s.common_name} really needs around ${s.min_tank_gal} gallons. At ${gal} it would be stunted or constantly stressed. Hold off until you can size up.`,
        slugs: [s.slug],
      });
    }
  }

  // Mixed water types (freshwater vs brackish/marine): a real dealbreaker.
  // Compared case-insensitively so "Freshwater" and "freshwater" aren't a clash.
  const byType = new Map<string, Species[]>();
  for (const s of species) {
    const t = norm(s.water_type);
    if (!t) continue;
    byType.set(t, [...(byType.get(t) ?? []), s]);
  }
  if (byType.size > 1) {
    const parts = [...byType.values()].map(
      (arr) => `${arr[0].water_type}: ${list(arr.map((s) => s.common_name))}`
    );
    issues.push({
      level: "conflict",
      title: "Mixed water types",
      detail: `These fish need different kinds of water (${parts.join("; ")}). They can't share a tank.`,
      slugs: species.filter((s) => s.water_type).map((s) => s.slug),
    });
  }

  // Temperature: also a real dealbreaker. Name the fish that doesn't fit.
  const tLo = (s: Species) => s.temp_min_f;
  const tHi = (s: Species) => s.temp_max_f;
  const temp = overlap(species, tLo, tHi);
  if (temp.known.length > 1 && !temp.range) {
    const odd = oddOneOut(temp.known, tLo, tHi);
    issues.push({
      level: "conflict",
      title: "Temperature mismatch",
      detail: odd
        ? `${odd.common_name} (${odd.temp_min_f}-${odd.temp_max_f}°F) doesn't share a safe temperature with the rest. Everything else can live together.`
        : `There's no temperature that suits all of them: ${temp.known
            .map((s) => `${s.common_name} ${s.temp_min_f}-${s.temp_max_f}°F`)
            .join(", ")}.`,
      slugs: odd ? [odd.slug] : temp.known.map((s) => s.slug),
    });
  }

  // pH: softer. Most captive-bred fish adapt to stable water.
  const pLo = (s: Species) => s.ph_min;
  const pHi = (s: Species) => s.ph_max;
  const ph = overlap(species, pLo, pHi);
  if (ph.known.length > 1 && !ph.range) {
    const odd = oddOneOut(ph.known, pLo, pHi);
    issues.push({
      level: "caution",
      title: "pH preferences differ",
      detail: odd
        ? `${odd.common_name} likes pH ${odd.ph_min}-${odd.ph_max}, which doesn't overlap with the others. Many fish settle into stable water fine, but it's worth knowing before you mix them.`
        : "Their ideal pH ranges don't overlap. Many fish settle into stable water fine, but it's worth knowing before you mix them.",
      slugs: odd ? [odd.slug] : ph.known.map((s) => s.slug),
    });
  }

  // A sliver of overlap is technically compatible but hard to hold in practice.
  if (temp.range && temp.known.length > 1 && temp.range.hi - temp.range.lo < 3) {
    issues.push({
      level: "caution",
      title: "Very narrow temperature window",
      detail: `They only share ${temp.range.lo === temp.range.hi ? `${temp.range.lo}°F` : `${temp.range.lo}-${temp.range.hi}°F`}. That's hard to hold steady, and it keeps some of them at the edge of what they like.`,
      slugs: temp.known.map((s) => s.slug),
    });
  }

  const hardness = overlap(species, (s) => s.gh_min, (s) => s.gh_max);

  // Schooling minimums
  for (const { species: s, qty } of stock) {
    if (s.min_group_size != null && s.min_group_size > 1 && qty < s.min_group_size) {
      issues.push({
        level: "caution",
        title: `${s.common_name} needs a group`,
        detail: `Keep at least ${s.min_group_size} together. You have ${qty}. Too few leaves them stressed, hiding, and often nippier.`,
        slugs: [s.slug],
      });
    }
  }

  // Fin nippers: a real problem with long-finned fish, a note otherwise.
  const nippers = species.filter((s) => s.fin_nipper);
  if (nippers.length > 0) {
    const targets = species.filter((s) => !s.fin_nipper && LONG_FIN.test(s.common_name));
    if (targets.length > 0) {
      issues.push({
        level: "caution",
        title: "Fin nippers with long fins",
        detail: `${list(nippers.map((n) => n.common_name))} can nip fins, and ${list(
          targets.map((t) => t.common_name)
        )} ${targets.length === 1 ? "has" : "have"} the long, slow fins they go for. Swap one side, or keep the nippers in a bigger group to spread it out.`,
        slugs: [...nippers, ...targets].map((s) => s.slug),
      });
    } else if (species.length > 1) {
      issues.push({
        level: "note",
        title: "Fin nipper in the mix",
        detail: `${list(nippers.map((n) => n.common_name))} can nip fins. Nothing here has long fins, so it should be fine. Just avoid adding bettas, angelfish or fancy guppies later.`,
        slugs: nippers.map((s) => s.slug),
      });
    }
  }

  // Predation by size. Hunters and bullies go after anything half their size;
  // even peaceful fish swallow tankmates a quarter their size (goldfish and
  // angelfish eat neons). Snails are safe in their shells.
  const seen = new Set<string>();
  for (const a of species) {
    // Shrimp and snails don't eat fish; crayfish and crabs do.
    if (isInvert(a) && !/cray|crab/i.test(`${a.group_name} ${a.common_name}`)) continue;
    const hunter = isPredator(a) || isAggressive(a) || isSemiAggressive(a);
    const aSize = a.max_size_in ?? 0;
    const prey: { s: Species; ratio: number }[] = [];
    for (const b of species) {
      if (a.slug === b.slug || /snail/i.test(`${b.group_name} ${b.common_name}`)) continue;
      const bSize = b.max_size_in ?? 0;
      const ratio = bSize > 0 ? aSize / bSize : 0;
      const risky = hunter ? ratio >= 2 && aSize >= 2.5 : ratio >= 4 && aSize >= 4;
      if (risky) {
        seen.add(`${a.slug}>${b.slug}`);
        prey.push({ s: b, ratio });
      }
    }
    if (prey.length === 0) continue;
    // One message per big fish, listing everything small enough to be food.
    prey.sort((x, y) => y.ratio - x.ratio);
    const serious = isPredator(a) || isAggressive(a) || prey.some((p) => p.ratio >= 4);
    const names = prey.map((p) => p.s.common_name);
    issues.push({
      level: serious ? "caution" : "note",
      title:
        prey.length === 1 ? `${a.common_name} may eat ${names[0]}` : `${a.common_name} may eat smaller tankmates`,
      detail: `${a.common_name} grows to about ${aSize}", big enough to swallow ${list(
        prey.map((p) => `${p.s.common_name} (${p.s.max_size_in}")`)
      )}. Anything that fits in its mouth is at risk, often at night.${
        serious ? "" : " Adding them as adults, bigger than a mouthful, lowers the risk."
      }`,
      slugs: [a.slug, ...prey.map((p) => p.s.slug)],
    });
  }

  // Crayfish and crabs grab sleeping fish from the bottom whatever their size.
  const grabbers = species.filter((s) => /cray|crab/i.test(`${s.group_name} ${s.common_name}`));
  const grabbable = fish.filter((s) => !grabbers.includes(s) && !seen.has(`${grabbers[0]?.slug}>${s.slug}`));
  if (grabbers.length > 0 && grabbable.length > 0) {
    issues.push({
      level: "caution",
      title: `${grabbers[0].common_name} can catch fish`,
      detail: `${grabbers[0].common_name} will grab slow or sleeping fish, especially bottom dwellers like ${list(
        grabbable.slice(0, 3).map((s) => s.common_name)
      )}. Fast, mid-water fish fare best, and lots of cover helps.`,
      slugs: [...grabbers, ...grabbable].map((s) => s.slug),
    });
  }

  // Shrimp with fish: adults often survive, babies rarely do.
  const shrimp = species.filter((s) => /shrimp/i.test(s.group_name ?? "") || /shrimp/i.test(s.common_name));
  const biggerFish = fish.filter((s) => (s.max_size_in ?? 0) >= 2);
  const shrimpAlreadyFlagged = shrimp.some((sh) => [...seen].some((k) => k.endsWith(`>${sh.slug}`)));
  if (shrimp.length > 0 && biggerFish.length > 0 && !shrimpAlreadyFlagged) {
    issues.push({
      level: "note",
      title: "Shrimp babies will get eaten",
      detail: `Adult ${shrimp[0].common_name} can live with ${list(
        biggerFish.slice(0, 3).map((s) => s.common_name)
      )}, but most baby shrimp will be eaten. Thick moss or plants give the colony a chance to grow.`,
      slugs: shrimp.map((s) => s.slug),
    });
  }

  // Temperament: always a caution at most. Aggression depends on the
  // individual fish and the setup, not a hard rule like tank size.
  const aggressive = species.filter(isAggressive);
  const semi = species.filter(isSemiAggressive);
  // Shrimp and snails are covered by the size checks above, not bullying.
  const peaceful = species.filter((s) => isPeaceful(s) && !isInvert(s));
  const small = g > 0 && g < 20;
  if (aggressive.length > 0 && peaceful.length > 0) {
    const hasBetta = aggressive.some((s) => /betta/i.test(s.common_name));
    let detail = `${list(aggressive.map((s) => s.common_name))} can bully peaceful fish like ${list(
      peaceful.slice(0, 4).map((s) => s.common_name)
    )}. Plenty of plants, hiding spots and broken sightlines help a lot.`;
    if (hasBetta)
      detail +=
        " Bettas vary by individual. Many live happily with calm tankmates, but have a backup plan in case yours doesn't.";
    if (small) detail += " In a tank this small there's little room to escape, so watch them closely early on.";
    issues.push({
      level: "caution",
      title: "Temperament to watch",
      detail,
      slugs: [...aggressive, ...peaceful].map((s) => s.slug),
    });
  } else if (semi.length > 0 && peaceful.length > 0 && (small || semi.length > 1)) {
    issues.push({
      level: "note",
      title: "Some attitude in the mix",
      detail: `${list(semi.map((s) => s.common_name))} can be pushy at feeding time or when claiming a spot. Usually fine with enough room and cover.`,
      slugs: semi.map((s) => s.slug),
    });
  }

  // Male bettas: one per tank, counting every betta variety together.
  const bettas = stock.filter(({ species: s }) => /betta/i.test(s.common_name) && !/female|sorority/i.test(s.common_name));
  const bettaCount = bettas.reduce((n, b) => n + b.qty, 0);
  if (bettaCount > 1) {
    issues.push({
      level: "conflict",
      title: bettas.length === 1 ? `More than one ${bettas[0].species.common_name}` : "More than one betta",
      detail: "Male bettas fight, often to the death. Keep one per tank unless they're fully divided.",
      slugs: bettas.map((b) => b.species.slug),
    });
  }

  // Stocking + equipment
  const stocking = computeStocking(g, stock);
  if (g > 0 && stocking.level === "over") {
    issues.push({
      level: "conflict",
      title: "Overstocked",
      detail: `You're well past a cautious stocking limit (about ${stocking.pct}%). Size up the tank or trim the list.`,
    });
  } else if (g > 0 && stocking.level === "near") {
    issues.push({
      level: "caution",
      title: "Heavily stocked",
      detail: `About ${stocking.pct}% of a cautious limit. Workable with strong filtration and steady water changes, but there's little room to add more.`,
    });
  }

  const messy = stock.some(({ species: s }) => MESSY_GROUPS.has(s.group_name ?? ""));
  // Coldwater: every fish has a known range and together they prefer it cool.
  const coldwater =
    temp.known.length > 0 &&
    temp.known.length === species.length &&
    !!temp.range &&
    temp.range.lo <= 66 &&
    temp.range.hi <= 76;
  const equipment = computeEquipment(g, stocking.pct, messy, temp.range, coldwater);

  // Order: conflicts, cautions, notes.
  const rank = { conflict: 0, caution: 1, note: 2 } as const;
  issues.sort((a, b) => rank[a.level] - rank[b.level]);

  const conflicts = issues.filter((i) => i.level === "conflict").length;
  const cautions = issues.filter((i) => i.level === "caution").length;
  const notes = issues.filter((i) => i.level === "note").length;
  const score =
    stock.length === 0 ? 0 : Math.max(5, Math.min(100, 100 - conflicts * 28 - cautions * 9 - notes * 2));

  return {
    equipment,
    stocking,
    issues,
    water: { temp: temp.range, ph: ph.range, gh: hardness.range },
    score,
  };
}

export function scoreLabel(score: number, conflicts: number): string {
  if (conflicts > 0) return "Needs changes";
  if (score >= 90) return "Great match";
  if (score >= 75) return "Good match";
  if (score >= 55) return "Workable";
  return "Risky";
}

export type Suggestion = { species: Species; qty: number; why: string };

/**
 * Fish that would slot in without adding a single conflict or caution. Tries
 * each species at its minimum group size and keeps the ones the engine is
 * happy with, favoring the part of the tank that's still empty.
 */
export function suggestTankmates(
  gallons: number,
  stock: StockItem[],
  all: Species[],
  limit = 8
): Suggestion[] {
  if (!(gallons > 0) || stock.length === 0) return [];
  const base = buildTank(gallons, stock);
  const baseBad = base.issues.filter((i) => i.level !== "note").length;
  const chosen = new Set(stock.map((s) => s.species.slug));
  const zones = new Set(stock.map((s) => swimZone(s.species)));
  const types = new Set(stock.map((s) => norm(s.species.water_type)).filter(Boolean));
  const out: (Suggestion & { rank: number })[] = [];

  for (const sp of all) {
    if (chosen.has(sp.slug)) continue;
    if (sp.min_tank_gal != null && sp.min_tank_gal > gallons) continue;
    if (types.size && sp.water_type && !types.has(norm(sp.water_type))) continue;
    if (sp.temp_min_f == null || sp.max_size_in == null) continue; // not enough data to vouch for it
    if (/not recommended|expert/i.test(sp.suitability ?? "")) continue; // don't push hard or problem fish
    const qty = Math.max(1, sp.min_group_size ?? 1);
    const next = buildTank(gallons, [...stock, { species: sp, qty }]);
    const bad = next.issues.filter((i) => i.level !== "note").length;
    if (bad > baseBad) continue;
    if (next.stocking.pct >= STOCK_NEAR_PCT) continue;
    const zone = swimZone(sp);
    const fillsGap = zone !== "all" && !zones.has(zone);
    const easy = /beginner|easy|common/i.test(sp.suitability ?? "");
    const newNotes = next.issues.length - base.issues.length;
    const pr = popularityRank(sp);
    const familiar = pr < 999 ? 30 - pr * 0.25 : 0;
    const rank = (fillsGap ? 40 : 0) + (easy ? 15 : 0) + familiar - newNotes * 10 + (isPeaceful(sp) ? 5 : 0);
    const why = fillsGap
      ? `Fills the ${zone === "mid" ? "middle" : zone} of the tank`
      : easy
      ? "Easy keeper, no conflicts"
      : "No conflicts with your fish";
    out.push({ species: sp, qty, why, rank });
  }

  out.sort((a, b) => b.rank - a.rank || a.species.common_name.localeCompare(b.species.common_name));
  // One per group so the list isn't ten kinds of tetra.
  const byGroup = new Set<string>();
  const picked: Suggestion[] = [];
  for (const s of out) {
    const key = s.species.group_name ?? s.species.slug;
    if (byGroup.has(key)) continue;
    byGroup.add(key);
    picked.push({ species: s.species, qty: s.qty, why: s.why });
    if (picked.length >= limit) break;
  }
  return picked;
}
