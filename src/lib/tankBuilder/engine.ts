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
};

export type Equipment = {
  heaterWattsLow: number;
  heaterWattsHigh: number;
  filterGphLow: number;
  filterGphHigh: number;
  heaterNote: string | null;
};

export type Stocking = {
  pct: number;
  level: "ok" | "near" | "over";
  label: string;
  reasoning: string;
};

export type BuildResult = {
  equipment: Equipment;
  stocking: Stocking;
  issues: Issue[];
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

function wasteFactor(s: Species): number {
  const g = s.group_name ?? "";
  if (LIGHT_GROUPS.has(g)) return 0.3;
  if (MESSY_GROUPS.has(g)) return 1.6;
  return 1.0;
}

export function computeStocking(gallons: number, stock: StockItem[]): Stocking {
  let load = 0;
  for (const { species, qty } of stock) {
    const size = species.max_size_in ?? 1;
    load += size * wasteFactor(species) * qty;
  }
  // Conservative ceiling: ~1.5 waste-adjusted adult-inches of fish per gallon.
  const capacity = gallons * 1.5;
  const pct = capacity > 0 ? Math.round((load / capacity) * 100) : 0;

  let level: Stocking["level"] = "ok";
  let label = "Comfortably stocked";
  if (pct > 100) {
    level = "over";
    label = "Overstocked";
  } else if (pct >= 85) {
    level = "near";
    label = "Near capacity";
  }

  const reasoning =
    "Estimated from the adult size and waste output of your fish against a deliberately conservative ceiling. It's a guide, not gospel — strong filtration and regular water changes buy you headroom.";

  return { pct, level, label, reasoning };
}

export function computeEquipment(
  gallons: number,
  stockingPct: number,
  messy: boolean
): Equipment {
  const round5 = (n: number) => Math.round(n / 5) * 5;
  const heaterWattsLow = round5(gallons * 3);
  const heaterWattsHigh = round5(gallons * 5);

  const filterHighX = stockingPct >= 85 || messy ? 8 : 6;
  const filterGphLow = Math.round(gallons * 4);
  const filterGphHigh = Math.round(gallons * filterHighX);

  const heaterNote =
    gallons >= 75
      ? "For a tank this size, two smaller heaters give more even, fail-safe heating than one big one."
      : null;

  return { heaterWattsLow, heaterWattsHigh, filterGphLow, filterGphHigh, heaterNote };
}

export function buildTank(gallons: number, stock: StockItem[]): BuildResult {
  const issues: Issue[] = [];
  const species = stock.map((s) => s.species);

  // Tank too small for a given fish
  for (const { species: s } of stock) {
    if (s.min_tank_gal != null && gallons > 0 && s.min_tank_gal > gallons) {
      issues.push({
        level: "conflict",
        title: `${s.common_name} needs a bigger tank`,
        detail: `It needs at least ${s.min_tank_gal} gallons to be kept well; your tank is ${gallons}.`,
      });
    }
  }

  // Mixed water types (freshwater vs brackish/marine)
  const waterTypes = new Set(
    species.map((s) => s.water_type).filter((w): w is string => !!w)
  );
  if (waterTypes.size > 1) {
    issues.push({
      level: "conflict",
      title: "Mixed water types",
      detail: `These species don't share the same water type (${[...waterTypes].join(
        ", "
      )}).`,
    });
  }

  // Temperature overlap
  const withTemp = species.filter(
    (s) => s.temp_min_f != null && s.temp_max_f != null
  );
  if (withTemp.length > 1) {
    const lo = Math.max(...withTemp.map((s) => s.temp_min_f as number));
    const hi = Math.min(...withTemp.map((s) => s.temp_max_f as number));
    if (lo > hi) {
      issues.push({
        level: "conflict",
        title: "Temperature mismatch",
        detail:
          "Your fish don't share a safe temperature range — some want it warmer than others can tolerate.",
      });
    }
  }

  // pH overlap (softer — many fish adapt)
  const withPh = species.filter((s) => s.ph_min != null && s.ph_max != null);
  if (withPh.length > 1) {
    const lo = Math.max(...withPh.map((s) => s.ph_min as number));
    const hi = Math.min(...withPh.map((s) => s.ph_max as number));
    if (lo > hi) {
      issues.push({
        level: "caution",
        title: "pH preferences differ",
        detail:
          "Their ideal pH ranges don't overlap. Many fish settle into stable water fine, but it's worth knowing before you mix them.",
      });
    }
  }

  // Schooling minimums
  for (const { species: s, qty } of stock) {
    if (s.min_group_size != null && s.min_group_size > 1 && qty < s.min_group_size) {
      issues.push({
        level: "caution",
        title: `${s.common_name} likes company`,
        detail: `Keep at least ${s.min_group_size} together; you have ${qty}. Too few leaves them stressed and often nippier.`,
      });
    }
  }

  // Fin-nippers
  const nippers = species.filter((s) => s.fin_nipper);
  if (nippers.length > 0 && species.length > 1) {
    issues.push({
      level: "caution",
      title: "Fin-nipper in the mix",
      detail: `${nippers
        .map((n) => n.common_name)
        .join(
          ", "
        )} can nip fins — avoid slow, long-finned tankmates like bettas, angelfish, or fancy guppies, and keep nippers in larger groups to spread it out.`,
    });
  }

  // Predation by size
  const seen = new Set<string>();
  for (const a of species) {
    const predator =
      (a.diet ?? "").toLowerCase().includes("carnivore") ||
      /aggress|predat/i.test(a.temperament ?? "");
    if (!predator) continue;
    for (const b of species) {
      if (a.slug === b.slug) continue;
      const aSize = a.max_size_in ?? 0;
      const bSize = b.max_size_in ?? 0;
      const key = `${a.slug}>${b.slug}`;
      if (bSize > 0 && aSize >= bSize * 2 && !seen.has(key)) {
        seen.add(key);
        issues.push({
          level: "caution",
          title: `${a.common_name} may eat ${b.common_name}`,
          detail: `${a.common_name} is large and predatory enough that anything able to fit in its mouth — like ${b.common_name} — is at risk.`,
        });
      }
    }
  }

  // Temperament — always a caution; aggression is individual and contextual,
  // not an objective dealbreaker the way tank size or stocking is.
  const aggressive = species.filter((s) =>
    /aggress|territor|predat/i.test(s.temperament ?? "")
  );
  const peaceful = species.filter((s) => /peace/i.test(s.temperament ?? ""));
  if (aggressive.length > 0 && peaceful.length > 0) {
    const hasBetta = aggressive.some((s) => /betta/i.test(s.common_name));
    const small = gallons > 0 && gallons < 20;
    let detail = `${aggressive
      .map((s) => s.common_name)
      .join(", ")} can be pushy toward peaceful fish like ${peaceful
      .map((s) => s.common_name)
      .join(
        ", "
      )}. Plenty of plants, hides, and broken sightlines go a long way.`;
    if (hasBetta) {
      detail +=
        " Bettas in particular vary by individual — many live happily with calm tankmates, but have a backup plan in case yours doesn't.";
    }
    if (small) {
      detail +=
        " In a tank this small there's little room to escape, so watch them closely early on.";
    }
    issues.push({ level: "caution", title: "Temperament to watch", detail });
  }

  // Stocking + equipment
  const stocking = computeStocking(gallons, stock);
  if (stocking.level === "over") {
    issues.push({
      level: "conflict",
      title: "Overstocked",
      detail: `You're at about ${stocking.pct}% of a conservative stocking ceiling. Size up the tank or trim the list.`,
    });
  } else if (stocking.level === "near") {
    issues.push({
      level: "caution",
      title: "Near capacity",
      detail: `About ${stocking.pct}% of a conservative ceiling — workable with strong filtration and steady water changes, but there's little room to add more.`,
    });
  }

  const messy = stock.some(({ species: s }) =>
    MESSY_GROUPS.has(s.group_name ?? "")
  );
  const equipment = computeEquipment(gallons, stocking.pct, messy);

  return { equipment, stocking, issues };
}