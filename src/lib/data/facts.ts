/**
 * The one place general aquarium numbers live.
 *
 * Water Check grades readings with these, and glossary entries, courses and
 * guides show them through {{fact.<key>}} placeholders (see tokens.ts), so a
 * number changed here changes everywhere at once. Keep values on the safe side.
 */

export const WATER = {
  /** ppm. At or below = healthy. */
  nitrateOk: 20,
  /** ppm. Change water before it reaches this. */
  nitrateWatch: 40,
  /** ppm. Above = very high; bring it down gradually. */
  nitrateHigh: 80,
  /** ppm. Ammonia or nitrite at or above this is an emergency. */
  toxicDanger: 0.5,
  /** ppm. During a fish-in cycle, change water once ammonia plus nitrite goes above this. */
  cycleAction: 0.25,
  /** pH at or above which any ammonia is urgent. */
  ammoniaHarshPh: 7.8,
  /** °F at or above which any ammonia is urgent. */
  ammoniaHarshTemp: 82,
  phLow: 6.0,
  phHigh: 8.4,
  phSoftEdge: 6.5,
  phHardEdge: 7.8,
  tempLow: 66,
  tempHigh: 86,
  tempCool: 72,
  tempWarm: 82,
  khLow: 3,
  ghSoft: 3,
  ghHard: 18,
} as const;

export const CARE = {
  tropicalTemp: [74, 80],
  heaterSetPoint: [76, 78],
  cyclingTemp: [78, 82],
  ichTemp: [82, 86],
  cycleWeeks: [4, 8],
  quarantineMinWeeks: 4,
  quarantineWeeks: [4, 6],
  waterChangePct: [20, 30],
  neglectedChangePct: [10, 15],
  heaterWattsPerGal: [3, 5],
  twoHeatersFromGal: 55,
  filterTurnover: [4, 6],
  co2Ppm: [20, 30],
  lightHours: [6, 8],
  firstTankGal: 20,
  bettaMinGal: 5,
  schoolMin: 6,
} as const;

const range = (r: readonly [number, number]) => `${r[0]} to ${r[1]}`;

/** What {{fact.<key>}} prints. Units stay in the sentence, not here. */
export const FACT_TEXT: Record<string, string> = {
  nitrate_ok: String(WATER.nitrateOk),
  nitrate_watch: String(WATER.nitrateWatch),
  nitrate_high: String(WATER.nitrateHigh),
  toxic_danger: String(WATER.toxicDanger),
  cycle_action: String(WATER.cycleAction),
  tropical_temp: range(CARE.tropicalTemp),
  heater_set: range(CARE.heaterSetPoint),
  cycling_temp: range(CARE.cyclingTemp),
  ich_temp: range(CARE.ichTemp),
  cycle_weeks: range(CARE.cycleWeeks),
  quarantine_min: String(CARE.quarantineMinWeeks),
  quarantine_weeks: range(CARE.quarantineWeeks),
  water_change: range(CARE.waterChangePct),
  neglected_change: range(CARE.neglectedChangePct),
  heater_watts: range(CARE.heaterWattsPerGal),
  two_heaters: String(CARE.twoHeatersFromGal),
  filter_turnover: range(CARE.filterTurnover),
  co2: range(CARE.co2Ppm),
  light_hours: range(CARE.lightHours),
  first_tank: String(CARE.firstTankGal),
  betta_min: String(CARE.bettaMinGal),
  school_min: String(CARE.schoolMin),
};
