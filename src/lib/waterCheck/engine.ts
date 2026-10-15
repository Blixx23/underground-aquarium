import type { Species, StockItem } from "@/lib/tankBuilder/engine";
import { WATER, CARE } from "@/lib/data/facts";

import { celsiusDeep } from "@/lib/units";
const HEAT = `${CARE.heaterSetPoint[0]}-${CARE.heaterSetPoint[1]}`;

export type WaterReading = {
  temp_f?: number | null;
  ph?: number | null;
  ammonia_ppm?: number | null;
  nitrite_ppm?: number | null;
  nitrate_ppm?: number | null;
  gh?: number | null; // dGH
  kh?: number | null; // dKH
};

export type WaterLevel = "danger" | "warning" | "note" | "ok";

export type WaterFinding = {
  parameter: string;
  level: WaterLevel;
  value: string;
  title: string;
  whatsHappening: string;
  howToFix: string;
  /** True when the number itself looks wrong (a typo, the wrong unit), so it got no advice. */
  check?: boolean;
};

export type WaterResult = {
  status: "danger" | "warning" | "ok" | "empty";
  findings: WaterFinding[];
};

// ---- Tuning knobs: universal safe ranges (not fish-specific) ----
// They live in lib/data/facts.ts so the glossary and courses quote the same numbers.
const NITRATE_OK = WATER.nitrateOk;
const NITRATE_WATCH = WATER.nitrateWatch;
const NITRATE_HIGH = WATER.nitrateHigh;
const PH_LOW = WATER.phLow;
const PH_HIGH = WATER.phHigh;
const PH_SOFT_EDGE = WATER.phSoftEdge;
const PH_HARD_EDGE = WATER.phHardEdge;
const PH_DANGER_LOW = WATER.phDangerLow;
const PH_DANGER_HIGH = WATER.phDangerHigh;
const TEMP_LOW = WATER.tempLow;
const TEMP_HIGH = WATER.tempHigh;
const TEMP_COOL = WATER.tempCool;
const TEMP_WARM = WATER.tempWarm;
const TEMP_DANGER = WATER.tempDanger;
const TEMP_COLD_DANGER = WATER.tempColdDanger;
const KH_LOW = WATER.khLow;
const GH_SOFT = WATER.ghSoft;
const GH_HARD = WATER.ghHard;
// Ammonia and nitrite: test kits step 0, 0.25, 0.5, 1. A 0.25 is a warning
// (do a water change), 0.5 and up is an emergency.
const TOXIC_DANGER = WATER.toxicDanger;
// -----------------------------------------------------------------

function has(v: number | null | undefined): v is number {
  return v != null && !Number.isNaN(v);
}
function fmt(v: number, unit: string) {
  return `${v}${unit}`;
}
const round1 = (v: number) => Math.round(v * 10) / 10;

// True when fish are entered and every one of them is comfortable at this value,
// e.g. a goldfish tank at 65°F or a blackwater tank at pH 5.8. Then an "unusual"
// reading is fine for this tank, and the advice says so instead of fighting it.
function stockSuits(
  species: Species[],
  minKey: "ph_min" | "temp_min_f",
  maxKey: "ph_max" | "temp_max_f",
  v: number
) {
  return (
    species.length > 0 &&
    species.every((s) => s[minKey] != null && s[maxKey] != null && v >= (s[minKey] as number) && v <= (s[maxKey] as number))
  );
}

const TAP_AMMONIA =
  " If it showed up right after a water change, test a glass of your tap water too: many cities treat water with chloramine, which leaves a little ammonia behind.";
const TAP_AMMONIA_FIX =
  " If your tap water shows about the same ammonia, use a conditioner that says it handles chloramine and ammonia, and don't chase it with more water changes, since fresh tap water just adds more. A cycled filter clears that small amount within a day.";
const DILUTE =
  "To get the real number, test a sample that's half tank water and half distilled water, then double the result.";

// ---------- Numbers that can't be real ----------
// A typo or the wrong unit should get "check this", never advice. Values that
// can't be true are dropped from the check; values in a known other unit
// (hardness in ppm) are converted; readings at the top of a kit's colour chart
// get a note that the real number may be higher.
export function screenReading(input: WaterReading): { clean: WaterReading; notices: WaterFinding[] } {
  const clean: WaterReading = { ...input };
  const notices: WaterFinding[] = [];
  const reject = (key: keyof WaterReading, parameter: string, value: string, title: string, whatsHappening: string, howToFix: string) => {
    clean[key] = null;
    notices.push({ parameter, level: "warning", value, title, whatsHappening, howToFix, check: true });
  };

  // Temperature (°F)
  const t = input.temp_f;
  if (has(t)) {
    if (t >= 10 && t <= 35) {
      const asF = Math.round((t * 9) / 5 + 32);
      reject(
        "temp_f", "Temperature", `${t}`, "Did you enter Celsius?",
        `This tool works in Fahrenheit, and ${t} in Fahrenheit would be frozen or nearly frozen water. ${t} in Celsius is about ${asF} in Fahrenheit, which is a normal aquarium temperature.`,
        `If your thermometer reads Celsius, enter ${asF} instead. If it really reads ${t} in Fahrenheit, your fish are in danger: warm the water slowly, about 2 degrees an hour.`
      );
    } else if (t < 10 || t > 110) {
      reject(
        "temp_f", "Temperature", `${t}`, "That temperature can't be right",
        `Aquarium water can't sit at ${t} in Fahrenheit: it would be solid ice or close to boiling.`,
        "Check the number you typed and look at the thermometer again. A stick-on strip thermometer can be hard to read; the lit-up number is the one to use."
      );
    }
  }

  // pH
  const p = input.ph;
  if (has(p)) {
    if (p >= 30 && p <= 90) {
      reject(
        "ph", "pH", String(p), "Missing a decimal point?",
        `pH only runs from 0 to 14, and aquarium water is almost always between 6 and 8.5. A ${p} is most likely ${round1(p / 10)} with the decimal point left out.`,
        `Enter ${round1(p / 10)} if that's what your test showed.`
      );
    } else if (p < 3 || p > 10.5) {
      reject(
        "ph", "pH", String(p), "That pH doesn't look like a real test result",
        p < 0 || p > 14
          ? "pH only runs from 0 to 14, so this number can't be right."
          : "Aquarium test kits only read from about 6 to 9, so this number didn't come from one. Water this acidic or alkaline would kill fish within hours.",
        "Check the number you typed. If a meter really shows this, do a 25% water change now, then calibrate the meter and test again."
      );
    }
  }

  // Ammonia, nitrite, nitrate (ppm)
  const chem: [keyof WaterReading, string, number, number][] = [
    ["ammonia_ppm", "Ammonia", WATER.kitTopAmmonia, 50],
    ["nitrite_ppm", "Nitrite", WATER.kitTopNitrite, 50],
    ["nitrate_ppm", "Nitrate", WATER.kitTopNitrate, 1000],
  ];
  for (const [key, parameter, top, impossible] of chem) {
    const v = input[key];
    if (!has(v)) continue;
    if (v < 0) {
      reject(key, parameter, fmt(v, " ppm"), "A test can't read below zero",
        "Test kits read from zero up, so a negative number must be a typo.",
        "Enter the number from the colour chart. If the test matched the lightest colour, that's 0.");
    } else if (v > impossible) {
      reject(key, parameter, fmt(v, " ppm"), "That's far above what any test kit reads",
        `Most ${parameter.toLowerCase()} kits top out at ${top} ppm, so ${v} ppm can't have come from the colour chart. ppm and mg/L are the same thing, so it isn't a unit mix-up.`,
        "Check the number you typed against the colour chart.");
    } else if (v >= top) {
      notices.push({
        parameter, level: "note", value: fmt(v, " ppm"),
        title: v === top ? "This is the top of the colour chart" : "Above the top of most colour charts",
        whatsHappening:
          v === top
            ? `${top} ppm is the darkest colour on most ${parameter.toLowerCase()} kits, so the real number could be a lot higher.`
            : `Most kits stop at ${top} ppm. If you diluted the sample and doubled the result, that's the right way to read it.`,
        howToFix: v === top ? DILUTE : "Nothing to fix in the number itself; the advice below uses it.",
      });
    }
  }

  // GH and KH: test strips often read ppm, not degrees.
  const hard: [keyof WaterReading, string, string][] = [
    ["gh", "GH", "dGH"],
    ["kh", "KH", "dKH"],
  ];
  for (const [key, parameter, unit] of hard) {
    const v = input[key];
    if (!has(v)) continue;
    if (v < 0) {
      reject(key, parameter, fmt(v, ` ${unit}`), "A test can't read below zero",
        "Hardness can't be negative, so this must be a typo.",
        "Enter the number from your test. If it read nothing at all, that's 0.");
    } else if (v > 1000) {
      reject(key, parameter, fmt(v, ` ${unit}`), "That hardness can't be right",
        "Even ppm readings from a test strip don't go this high.",
        "Check the number you typed.");
    } else if (v > 30) {
      const deg = round1(v / WATER.ppmPerDegree);
      clean[key] = deg;
      notices.push({
        parameter, level: "note", value: `${v} ppm`,
        title: `Read as ppm: about ${deg} ${unit}`,
        whatsHappening: `Aquarium water almost never goes above 30 ${unit}, but test strips often show ${parameter} in ppm. ${v} ppm is about ${deg} ${unit}, and the check below uses that.`,
        howToFix: `To convert yourself, divide ppm by about 18. If your test really reads ${v} ${unit}, re-test, since that would be extraordinarily hard water.`,
      });
    }
  }

  return { clean, notices };
}

export function checkWater(
  input: WaterReading,
  stock: StockItem[] = []
): WaterResult {
  const { clean: reading, notices } = screenReading(input);
  const findings: WaterFinding[] = [...notices];
  const species: Species[] = stock.map((s) => s.species);
  // Ammonia is far more toxic in alkaline or warm water.
  const harshWater = (has(reading.ph) && reading.ph >= WATER.ammoniaHarshPh) || (has(reading.temp_f) && reading.temp_f >= WATER.ammoniaHarshTemp);
  const phSuits = has(reading.ph) && stockSuits(species, "ph_min", "ph_max", reading.ph);

  // ---------- Universal: cycle & toxicity (no fish needed) ----------

  // Ammonia: should be zero
  if (has(reading.ammonia_ppm)) {
    const a = reading.ammonia_ppm;
    if (a <= 0) {
      findings.push({
        parameter: "Ammonia",
        level: "ok",
        value: fmt(a, " ppm"),
        title: "Ammonia is at zero",
        whatsHappening:
          "No ammonia means your biological filter is keeping up with the waste your fish produce. This is exactly what you want.",
        howToFix: "Nothing to do. Keep up your regular maintenance.",
      });
    } else if (a < TOXIC_DANGER && harshWater) {
      findings.push({
        parameter: "Ammonia",
        level: "danger",
        value: fmt(a, " ppm"),
        title: "Ammonia in alkaline or warm water",
        whatsHappening:
          "Even a trace of ammonia is urgent here. At a pH of 7.8 or higher, or in warm water, much more of it is in its toxic form, so a reading that would be a warning in soft, cool water can burn gills." +
          TAP_AMMONIA,
        howToFix:
          "Do a 50% water change now with dechlorinated water, then test again. Stop feeding for a day or two, add no fish, and keep changing water until ammonia reads zero." +
          TAP_AMMONIA_FIX,
      });
    } else if (a < TOXIC_DANGER) {
      findings.push({
        parameter: "Ammonia",
        level: "warning",
        value: fmt(a, " ppm"),
        title: "Traces of ammonia",
        whatsHappening:
          "Ammonia is the waste fish and leftover food give off, and it's toxic even at low levels. A trace usually means the tank is still cycling, you're feeding a bit much, or the filter took a hit." +
          TAP_AMMONIA,
        howToFix:
          "Do a 25-50% water change with dechlorinated water, ease off feeding for a day or two, and hold off adding fish until it reads zero." +
          TAP_AMMONIA_FIX,
      });
    } else {
      findings.push({
        parameter: "Ammonia",
        level: "danger",
        value: fmt(a, " ppm"),
        title: "Ammonia is too high",
        whatsHappening:
          "Ammonia is toxic, and at this level it's actively stressing or chemically burning your fish. It means the tank can't process waste fast enough, most often because of an un-cycled new tank, overstocking, or overfeeding." +
          TAP_AMMONIA,
        howToFix:
          "Do a large (50%) water change right now with dechlorinated water, and another tomorrow if it's still high. Stop feeding for a couple of days, add no fish, and a bottled beneficial-bacteria supplement can speed the cycle." +
          TAP_AMMONIA_FIX,
      });
    }
  }

  // Nitrite: should be zero
  if (has(reading.nitrite_ppm)) {
    const n = reading.nitrite_ppm;
    if (n <= 0) {
      findings.push({
        parameter: "Nitrite",
        level: "ok",
        value: fmt(n, " ppm"),
        title: "Nitrite is at zero",
        whatsHappening:
          "Zero nitrite means the second stage of your cycle is working. Together with zero ammonia, that's a healthy, cycled tank.",
        howToFix: "Nothing to do here.",
      });
    } else if (n < TOXIC_DANGER) {
      findings.push({
        parameter: "Nitrite",
        level: "warning",
        value: fmt(n, " ppm"),
        title: "Traces of nitrite",
        whatsHappening:
          "Nitrite is the middle step of the cycle and still toxic. It stops fish blood from carrying oxygen. Detecting it usually means a tank that's mid-cycle or a filter that was recently disturbed.",
        howToFix:
          "Do a 25-50% water change, hold off on feeding and new fish, and give the filter time. The cycle is done when ammonia and nitrite both sit at zero.",
      });
    } else {
      findings.push({
        parameter: "Nitrite",
        level: "danger",
        value: fmt(n, " ppm"),
        title: "Nitrite is too high",
        whatsHappening:
          "At this level nitrite is suffocating your fish. It blocks their blood from carrying oxygen, so you may see them gasping near the surface. The tank isn't fully cycled, or the filter has crashed.",
        howToFix:
          "Large (50%) water change now, and again tomorrow if needed. Stop feeding, add no new fish, and consider a beneficial-bacteria supplement.",
      });
    }
  }

  // Nitrate: accumulates; lower is better
  if (has(reading.nitrate_ppm)) {
    const n = reading.nitrate_ppm;
    if (n <= NITRATE_OK) {
      findings.push({
        parameter: "Nitrate",
        level: "ok",
        value: fmt(n, " ppm"),
        title: "Nitrate is in a healthy range",
        whatsHappening:
          "Nitrate is the harmless end-product of the cycle, and yours is low, a sign of a well-maintained tank.",
        howToFix: "Nothing to do. Your water-change routine is working.",
      });
    } else if (n <= NITRATE_WATCH) {
      findings.push({
        parameter: "Nitrate",
        level: "note",
        value: fmt(n, " ppm"),
        title: "Nitrate is creeping up",
        whatsHappening:
          "Nitrate builds up steadily between water changes. It's far less toxic than ammonia or nitrite, but it's getting to the point where a change is due.",
        howToFix:
          "A 25-30% water change brings it down. Live plants also soak up nitrate if you want a longer-term buffer.",
      });
    } else if (n <= NITRATE_HIGH) {
      findings.push({
        parameter: "Nitrate",
        level: "warning",
        value: fmt(n, " ppm"),
        title: "Nitrate is high",
        whatsHappening:
          "Sustained high nitrate stresses fish over time and fuels algae. It usually means water changes are overdue, the tank is overstocked, or you're feeding heavily.",
        howToFix:
          "Do a 30-50% water change now, then get on a regular weekly schedule. Easing off feeding and adding live plants both help. If your tap water already has nitrate in it, water changes can only bring the tank down to that level, so test the tap too.",
      });
    } else {
      findings.push({
        parameter: "Nitrate",
        level: "danger",
        value: fmt(n, " ppm"),
        title: "Nitrate is very high",
        whatsHappening:
          "This is high enough to make fish chronically unwell. It needs to come down gradually. One huge change when nitrate is very high can shock fish, because the swing itself is stressful.",
        howToFix:
          "Do a couple of 30% changes a day or two apart rather than one massive one, then commit to weekly changes. If the tank hasn't had a water change in months, or its pH is well below your tap water's, start smaller: 10 to 15% every two or three days, testing pH as you go. Check whether the tank is overstocked or overfed.",
      });
    }
  }

  // pH: universal extremes only; the right number depends on the fish
  if (has(reading.ph)) {
    const p = reading.ph;
    if (p < PH_DANGER_LOW && !phSuits) {
      findings.push({
        parameter: "pH",
        level: "danger",
        value: String(p),
        title: "pH is dangerously low",
        whatsHappening:
          "Below 5, almost no aquarium fish are comfortable: gills and slime coat get irritated, and the filter bacteria stop working, so waste can build up unseen. A drop this far usually means the water's buffer (KH) has run out.",
        howToFix:
          "Do a 25% water change now with dechlorinated water and another the next day, so pH comes up gradually with fresh buffer. Then raise KH slowly with a little crushed coral, or baking soda (about 1 teaspoon per 50 gallons raises KH by roughly 1 dKH), no more than 1 dKH a day. Avoid pH-up products that jump it all at once, and test ammonia too.",
      });
    } else if (p > PH_DANGER_HIGH && !phSuits) {
      findings.push({
        parameter: "pH",
        level: "danger",
        value: String(p),
        title: "pH is dangerously high",
        whatsHappening:
          "Above 9, the water starts to burn fish gills and skin, and any ammonia becomes far more toxic. Common causes are new rock, concrete or decor leaching into the water, too much pH-up product, or very hard tap water.",
        howToFix:
          "If your tap water's pH is lower, do a 25% water change now and repeat daily until it settles. Take out anything new you suspect, like rocks or ornaments. Avoid pH-down products that drop it fast, and test ammonia too.",
      });
    } else if (p >= PH_LOW && p <= PH_HIGH) {
      if (p < PH_SOFT_EDGE) {
        findings.push(
          phSuits
            ? {
                parameter: "pH",
                level: "ok",
                value: String(p),
                title: "pH suits your soft-water fish",
                whatsHappening: "Acidic water like this is what your fish come from. What matters now is keeping it steady.",
                howToFix: "Nothing to change. Keep up regular water changes so it doesn't slowly drift lower.",
              }
            : {
                parameter: "pH",
                level: "note",
                value: String(p),
                title: "pH is on the soft, acidic side",
                whatsHappening:
                  "This sits at the acidic end of the normal range. It's ideal for soft-water fish like tetras, rasboras, and most South American species, but a bit low for hard-water fish like livebearers and African cichlids. What matters most is that it stays steady.",
                howToFix:
                  "Nothing urgent. If your fish prefer harder water, raise it slowly with a little crushed coral, and check your KH, since weak buffering is the usual cause of a drifting low pH.",
              }
        );
      } else if (p > PH_HARD_EDGE) {
        findings.push(
          phSuits
            ? {
                parameter: "pH",
                level: "ok",
                value: String(p),
                title: "pH suits your hard-water fish",
                whatsHappening: "Alkaline water like this is what your fish do best in. Keep it steady.",
                howToFix: "Nothing to change.",
              }
            : {
                parameter: "pH",
                level: "note",
                value: String(p),
                title: "pH is on the hard, alkaline side",
                whatsHappening:
                  "This sits at the alkaline end of the normal range. It's great for livebearers, goldfish, and African cichlids, but a bit high for soft-water fish like tetras and many catfish.",
                howToFix:
                  "Nothing urgent. If your fish prefer softer water, driftwood or peat lower it gently over time. Avoid sudden chemical swings.",
              }
        );
      } else {
        findings.push({
          parameter: "pH",
          level: "ok",
          value: String(p),
          title: "pH is in a comfortable range",
          whatsHappening:
            "This is a middle-of-the-road pH that suits a broad range of community fish. What matters more than the exact number is that it stays steady.",
          howToFix:
            "Nothing needed. Avoid chasing a 'perfect' number with chemicals, since a stable pH beats a textbook one.",
        });
      }
    } else if (p < PH_LOW) {
      findings.push(
        phSuits
          ? {
              parameter: "pH",
              level: "note",
              value: String(p),
              title: "Very soft, acidic water that suits your fish",
              whatsHappening:
                "This is low for most tanks, but right for your fish. With so little buffer the pH can keep sliding, and below about 6 the filter bacteria slow down, so watch ammonia.",
              howToFix:
                "Don't add crushed coral; your fish like it this soft. Keep up regular water changes and test pH and ammonia weekly so a slide gets caught early.",
            }
          : {
              parameter: "pH",
              level: "warning",
              value: String(p),
              title: "pH is on the low (acidic) side",
              whatsHappening:
                "A low pH can stress fish that prefer neutral or hard water, and very low readings can even stall your biological filter. It's often caused by soft tap water, driftwood, or a depleted buffer (low KH).",
              howToFix:
                "Don't jolt it back up. Adjust slowly. A little crushed coral in the filter raises it gently over time. Check your KH too; weak buffering is usually the real cause.",
            }
      );
    } else {
      findings.push(
        phSuits
          ? {
              parameter: "pH",
              level: "note",
              value: String(p),
              title: "Very hard, alkaline water that suits your fish",
              whatsHappening:
                "High for most tanks, but right for your fish. At this pH any ammonia is much more toxic, so a cycled filter matters even more.",
              howToFix: "Nothing to change. Keep it steady and test ammonia regularly.",
            }
          : {
              parameter: "pH",
              level: "warning",
              value: String(p),
              title: "pH is on the high (alkaline) side",
              whatsHappening:
                "A high pH suits hard-water fish like livebearers and African cichlids but is rough on soft-water fish like tetras and many catfish. It usually reflects hard tap water or rocks/substrate that raise it.",
              howToFix:
                "Easiest fix is matching fish to your water rather than fighting it. To lower it gently, driftwood or peat help. Avoid sudden chemical swings.",
            }
      );
    }
  }

  // Temperature: universal extremes only; ideal depends on the fish
  if (has(reading.temp_f)) {
    const t = reading.temp_f;
    const suits = stockSuits(species, "temp_min_f", "temp_max_f", t);
    if (t >= TEMP_DANGER) {
      findings.push({
        parameter: "Temperature",
        level: "danger",
        value: fmt(t, "°F"),
        title: "Water is dangerously hot",
        whatsHappening:
          "At this temperature the water holds very little oxygen while fish need more of it, so they can suffocate within hours. Filter bacteria start to suffer too.",
        howToFix:
          "Cool it now, but steadily, about 2 to 3 degrees an hour: unplug the heater, turn off the lights, open the lid, point a fan across the surface and add an air stone. A sealed bag of ice or cold water floated in the tank helps; don't drop ice straight in. Don't feed until it's back under 82°F.",
      });
    } else if (t > TEMP_HIGH) {
      findings.push({
        parameter: "Temperature",
        level: "warning",
        value: fmt(t, "°F"),
        title: "Water is hot",
        whatsHappening:
          "Warm water holds less oxygen, so fish can end up gasping at the surface, and the heat speeds up their metabolism and stresses them.",
        howToFix:
          "Cool it gradually with a fan across the surface, a partial cooler-water change, or lifting the lid. Bring it down slowly; sudden swings are worse than the heat itself.",
      });
    } else if (t < TEMP_COLD_DANGER && !suits) {
      const fishIn = species.length > 0;
      findings.push({
        parameter: "Temperature",
        level: "danger",
        value: fmt(t, "°F"),
        title: fishIn ? "Water is dangerously cold for your fish" : "Water is dangerously cold for tropical fish",
        whatsHappening:
          "Below 60°F tropical fish shut down: they stop eating, their immune system stalls and disease takes hold fast. The usual cause is a heater that failed or came unplugged." +
          (fishIn ? "" : " If you keep only coldwater fish like goldfish, this can be fine; pick your tank to check against your own fish."),
        howToFix:
          "If you keep tropical fish, warm it back up slowly, about 2 degrees an hour: check the heater is plugged in and its light comes on, or replace it, and set it to " +
          `${HEAT}°F. Wrap a towel around the tank to hold heat meanwhile. Don't feed until the fish are active again.`,
      });
    } else if (t < TEMP_LOW) {
      findings.push(
        suits
          ? {
              parameter: "Temperature",
              level: "ok",
              value: fmt(t, "°F"),
              title: "Cool water that suits your fish",
              whatsHappening: "Cold for tropical fish, but right for yours.",
              howToFix: "Nothing to do. Just keep it steady.",
            }
          : {
              parameter: "Temperature",
              level: "warning",
              value: fmt(t, "°F"),
              title: "Water is cold",
              whatsHappening:
                "Most tropical fish slow down, stop eating, and get more disease-prone below the low 70s. Coldwater fish like goldfish are fine here; tropicals aren't.",
              howToFix: `If you keep tropical fish, add or turn up a heater and raise it a couple of degrees at a time toward ${HEAT}°F.`,
            }
      );
    } else if (t < TEMP_COOL) {
      findings.push(
        suits
          ? {
              parameter: "Temperature",
              level: "ok",
              value: fmt(t, "°F"),
              title: "Cool water that suits your fish",
              whatsHappening: "On the cool side for tropical fish, but right for yours.",
              howToFix: "Nothing to do. Just keep it steady.",
            }
          : {
              parameter: "Temperature",
              level: "note",
              value: fmt(t, "°F"),
              title: "Water is on the cool side",
              whatsHappening:
                "Comfortable for coldwater fish like goldfish, and the cooler end for many tropicals. Most tropical community fish are happiest a few degrees warmer.",
              howToFix: `If you keep tropicals, nudge a heater up toward ${HEAT}°F a degree at a time. Coldwater setups are fine as-is.`,
            }
      );
    } else if (t > TEMP_WARM) {
      findings.push(
        suits
          ? {
              parameter: "Temperature",
              level: "ok",
              value: fmt(t, "°F"),
              title: "Warm water that suits your fish",
              whatsHappening: "Warm for most tanks, but right for your fish. Warm water holds less oxygen, so good surface movement helps.",
              howToFix: "Nothing to do. Just keep it steady.",
            }
          : {
              parameter: "Temperature",
              level: "note",
              value: fmt(t, "°F"),
              title: "Water is on the warm side",
              whatsHappening:
                "Fine for many fish but toward the warm end. Warm water holds less oxygen, so keep an eye out for fish hanging near the surface.",
              howToFix: "No action needed unless fish look stressed. To cool it, do so gradually. A fan across the surface helps more than ice.",
            }
      );
    } else {
      findings.push({
        parameter: "Temperature",
        level: "ok",
        value: fmt(t, "°F"),
        title: "Temperature is in a comfortable range",
        whatsHappening: "A solid middle-of-the-road temperature for most tropical community fish.",
        howToFix: "Nothing to do. Just keep it steady.",
      });
    }
  }

  // GH: general hardness. No right number for every tank, only extremes.
  if (has(reading.gh)) {
    const g = reading.gh;
    findings.push(
      g < GH_SOFT
        ? {
            parameter: "GH",
            level: "note",
            value: fmt(g, " dGH"),
            title: "Very soft water",
            whatsHappening:
              "Your water has very few minerals. Soft-water fish like tetras, rasboras and many South American cichlids love it, but livebearers, goldfish and snails struggle, and snail shells can thin out.",
            howToFix:
              "Fine for soft-water fish. For livebearers or snails, a remineralizer or a little crushed coral raises it slowly.",
          }
        : g > GH_HARD
        ? {
            parameter: "GH",
            level: "note",
            value: fmt(g, " dGH"),
            title: "Very hard water",
            whatsHappening:
              "Your water is mineral-rich. Livebearers, goldfish and African cichlids do well in it, but soft-water fish like tetras and rasboras rarely show their best color or breed.",
            howToFix:
              "Easiest is picking fish that like hard water. To soften it, mix in some RO or distilled water at each water change.",
          }
        : {
            parameter: "GH",
            level: "ok",
            value: fmt(g, " dGH"),
            title: "Hardness is in a common range",
            whatsHappening: "Moderate hardness that suits most community fish.",
            howToFix: "Nothing to do.",
          }
    );
  }

  // KH: buffering / pH stability
  if (has(reading.kh)) {
    const k = reading.kh;
    if (k >= KH_LOW) {
      findings.push({
        parameter: "KH",
        level: "ok",
        value: fmt(k, " dKH"),
        title: "KH is holding your pH steady",
        whatsHappening: "Enough buffer that your pH shouldn't swing between water changes.",
        howToFix: "Nothing to do.",
      });
    } else if (phSuits) {
      // Soft-water fish: low KH is normal; the job is keeping pH from sliding, not raising it.
      findings.push({
        parameter: "KH",
        level: "note",
        value: fmt(k, " dKH"),
        title: "Low KH, normal for soft-water fish",
        whatsHappening:
          "Soft, acidic tanks naturally have little buffer, and your fish like it that way. The catch is that pH can slide further between water changes.",
        howToFix: "Don't add crushed coral or baking soda. Regular water changes put a little buffer back each time; test pH weekly to catch any slide.",
      });
    } else {
      findings.push({
        parameter: "KH",
        level: k < 1 ? "warning" : "note",
        value: fmt(k, " dKH"),
        title: k < 1 ? "No buffer left, so pH can crash" : "Low carbonate hardness, so pH can swing",
        whatsHappening:
          "KH is your water's buffer; it's what keeps pH steady. When it's this low, pH can drift or crash between water changes, which is harder on fish than a stable 'wrong' pH.",
        howToFix:
          "A small amount of crushed coral in the filter raises KH and steadies your pH. Baking soda works faster: about 1 teaspoon per 50 gallons raises KH by roughly 1 dKH. Raise it no more than 1 to 2 dKH a day, and re-test.",
      });
    }
  }

  // ---------- Fish-fit: do your numbers suit your stock? ----------
  // Reuses the preferred ranges already stored on each species.

  // pH fit
  if (has(reading.ph)) {
    const withPh = species.filter((s) => s.ph_min != null && s.ph_max != null);
    if (withPh.length > 0) {
      const lo = Math.max(...withPh.map((s) => s.ph_min as number));
      const hi = Math.min(...withPh.map((s) => s.ph_max as number));
      if (lo > hi) {
        findings.push({
          parameter: "pH vs. your fish",
          level: "warning",
          value: String(reading.ph),
          title: "Your fish don't share a pH range",
          whatsHappening:
            "Some of your fish need softer, more acidic water and others need harder, alkaline water, so no single pH suits them all. One group will always be under stress.",
          howToFix: "Rehome one group, or plan separate tanks. The Tank Builder shows which fish clash.",
        });
      } else if (reading.ph < lo || reading.ph > hi) {
        findings.push({
          parameter: "pH vs. your fish",
          level: "warning",
          value: String(reading.ph),
          title: "pH doesn't match your stocked fish",
          whatsHappening: `Your reading is ${reading.ph}, but the fish you've added overlap best around ${lo}-${hi}. Outside that window they're workable but less comfortable and more prone to stress.`,
          howToFix:
            "Adjust slowly with natural methods (crushed coral to raise, driftwood/peat to lower), or, honestly, the calmest path is keeping fish that already suit your tap water. Steady beats perfect.",
        });
      }
    }
  }

  // Temperature fit
  if (has(reading.temp_f)) {
    const withTemp = species.filter(
      (s) => s.temp_min_f != null && s.temp_max_f != null
    );
    if (withTemp.length > 0) {
      const lo = Math.max(...withTemp.map((s) => s.temp_min_f as number));
      const hi = Math.min(...withTemp.map((s) => s.temp_max_f as number));
      if (lo > hi) {
        findings.push({
          parameter: "Temperature vs. your fish",
          level: "warning",
          value: fmt(reading.temp_f, "°F"),
          title: "Your fish don't share a temperature range",
          whatsHappening:
            "Some of your fish need cooler water than the others can live in long term (goldfish with tropical fish is the classic case), so no single temperature suits them all.",
          howToFix: "Rehome one group, or plan separate tanks. The Tank Builder shows which fish clash.",
        });
      } else if (reading.temp_f < lo || reading.temp_f > hi) {
        findings.push({
          parameter: "Temperature vs. your fish",
          level: "warning",
          value: fmt(reading.temp_f, "°F"),
          title: "Temperature doesn't match your stocked fish",
          whatsHappening: `Your reading is ${reading.temp_f}°F, but your fish overlap best between ${lo}-${hi}°F. Too far off and they get sluggish, stop eating, or get stressed.`,
          howToFix:
            "Nudge the heater a degree or two at a time until you're inside that range. Never a big jump at once.",
        });
      }
    }
  }

  // Hardness fit: softer than pH, so a note. Most captive-bred fish adapt.
  if (has(reading.gh)) {
    const withGh = species.filter((s) => s.gh_min != null && s.gh_max != null);
    if (withGh.length > 0) {
      const lo = Math.max(...withGh.map((s) => s.gh_min as number));
      const hi = Math.min(...withGh.map((s) => s.gh_max as number));
      if (lo > hi) {
        findings.push({
          parameter: "GH vs. your fish",
          level: "note",
          value: fmt(reading.gh, " dGH"),
          title: "Your fish don't share a hardness range",
          whatsHappening: "Some of your fish prefer soft water and others hard water, so no single hardness suits them all perfectly.",
          howToFix: "Aim for the middle and keep it steady, or plan separate tanks for the soft-water and hard-water fish.",
        });
      } else if (reading.gh < lo || reading.gh > hi) {
        findings.push({
          parameter: "GH vs. your fish",
          level: "note",
          value: fmt(reading.gh, " dGH"),
          title: reading.gh < lo ? "Water is softer than your fish like" : "Water is harder than your fish like",
          whatsHappening: `Your reading is ${reading.gh} dGH, and your fish overlap best between ${lo}-${hi} dGH. Most settle in fine if it stays steady, but they may not color up or breed.`,
          howToFix:
            reading.gh < lo
              ? "A remineralizer or a little crushed coral raises it slowly. Change it gradually over a few water changes."
              : "Mix some RO or distilled water into your water changes to bring it down a little at a time.",
        });
      }
    }
  }

  // ---------- Overall status ----------
  const status: WaterResult["status"] =
    findings.length === 0
      ? "empty"
      : findings.some((f) => f.level === "danger")
      ? "danger"
      : findings.some((f) => f.level === "warning")
      ? "warning"
      : "ok";

  // Every °F in the results also shows its °C (see lib/units).
  return celsiusDeep({ status, findings });
}

// ---------- One plan for readings that share a cause ----------
// Ammonia, nitrite and nitrate are links in one chain (the nitrogen cycle), and
// low pH with low KH are one buffering problem. Listing them separately gives
// several overlapping, sometimes clashing fixes. The plan explains how they
// connect and gives one set of steps, always on the safe, conservative side.

export type WaterPlan = {
  level: "danger" | "warning" | "note";
  title: string;
  /** Why these readings belong together, in plain words. */
  why: string;
  /** One ordered set of steps that covers every linked reading. */
  steps: string[];
  /** How to know it's fixed. */
  doneWhen: string;
  /** Findings (by parameter) whose fix is covered here. */
  covers: string[];
};

export function waterPlans(input: WaterReading, stock: StockItem[] = []): WaterPlan[] {
  const { clean: reading } = screenReading(input);
  const species: Species[] = stock.map((s) => s.species);
  const plans: WaterPlan[] = [];
  const a = has(reading.ammonia_ppm) ? reading.ammonia_ppm : null;
  const n = has(reading.nitrite_ppm) ? reading.nitrite_ppm : null;
  const no3 = has(reading.nitrate_ppm) ? reading.nitrate_ppm : null;
  const ph = has(reading.ph) ? reading.ph : null;
  const kh = has(reading.kh) ? reading.kh : null;
  const t = has(reading.temp_f) ? reading.temp_f : null;
  const phSuits = ph != null && stockSuits(species, "ph_min", "ph_max", ph);

  const ammonia = (a ?? 0) > 0;
  const nitrite = (n ?? 0) > 0;
  if (ammonia || nitrite) {
    const harsh = (ph != null && ph >= WATER.ammoniaHarshPh) || (t != null && t >= WATER.ammoniaHarshTemp);
    const worst = Math.max(a ?? 0, n ?? 0);
    const urgent = worst >= TOXIC_DANGER || (ammonia && harsh);
    const veryHighNitrate = no3 != null && no3 > NITRATE_HIGH;
    // Low pH or KH alongside ammonia: raising them now would make the ammonia worse,
    // so this plan takes them over and says to leave them until ammonia is gone.
    const lowPh = ph != null && ph < PH_SOFT_EDGE && !phSuits;
    const lowKh = kh != null && kh < KH_LOW && !phSuits;

    let what: string;
    if (ammonia && nitrite) {
      what =
        "Ammonia and nitrite showing up together means your tank's filter bacteria haven't caught up with the waste. Fish waste and leftover food turn into ammonia, one group of bacteria turns ammonia into nitrite, and a second group turns nitrite into nitrate, which is far safer. Both of the first two are toxic, and seeing both means neither group is keeping up yet.";
    } else if (nitrite) {
      what =
        "Nitrite with no ammonia means the first half of your cycle is working (ammonia is being turned into nitrite), but the bacteria that turn nitrite into the much safer nitrate haven't caught up yet.";
    } else {
      what =
        "Ammonia with no nitrite means more waste is going in than your filter bacteria can handle. Fish waste and leftover food become ammonia, and the bacteria that remove it are being outpaced.";
    }
    const causes =
      " The usual causes are a tank that's still cycling, a filter that was recently cleaned, replaced or treated with medication, too much food, too many fish, or something dead or rotting in the tank. These readings are one problem, not several, so one plan fixes all of them.";
    const nitrateNote =
      no3 == null
        ? ""
        : no3 <= 5 && (ammonia || nitrite)
        ? " Your very low nitrate fits this picture: little is making it all the way through the cycle yet."
        : veryHighNitrate
        ? " Your nitrate is also very high, which means waste has been building for a while. The same water changes bring it down, done in smaller steps so the change itself doesn't shock the fish."
        : " Some nitrate is a good sign: part of the cycle is working, so it should recover with a little help.";
    const harshNote = harsh && ammonia
      ? ` Your ${ph != null && ph >= WATER.ammoniaHarshPh ? "high pH" : "warm water"} makes ammonia more toxic, so this is more urgent than the number alone suggests.`
      : "";
    const bufferNote =
      lowPh || lowKh
        ? " Your low pH and KH matter too, but they come second: in acidic water more of the ammonia is in a less harmful form, so raising pH first would make things worse."
        : "";

    const changeStep = urgent
      ? veryHighNitrate
        ? "Do a 25% water change now and another 25% a few hours later, rather than one big one. Match the new water's temperature to the tank and treat it with dechlorinator first."
        : "Do a 50% water change now. Match the new water's temperature to the tank and treat it with dechlorinator first. If the tank hasn't had a water change in a month or more, split it into two 25% changes a few hours apart so the fish aren't shocked."
      : "Do a 25 to 30% water change today. Match the new water's temperature to the tank and treat it with dechlorinator first.";

    const steps = [
      ...(ammonia
        ? [
            "First, test a glass of your tap water for ammonia. If it shows about the same as the tank, the ammonia is coming from chloramine in your tap water: use a conditioner that says it handles chloramine and ammonia, skip the extra water changes below, and the filter will clear it within a day.",
          ]
        : []),
      changeStep,
      "Use a water conditioner that says it detoxifies ammonia and nitrite. It makes them safer for about a day while the bacteria catch up, but it doesn't remove them, so keep testing.",
      "Stop feeding for a day or two, then feed a small amount every other day until the readings are back to zero. Less food means less ammonia.",
      "Don't add any fish, and don't clean, rinse in tap water or replace the filter media. The bacteria you need live there. If the filter is clogged, swish it gently in a bucket of old tank water.",
      "Test ammonia and nitrite every day. Whenever ammonia and nitrite together reach 0.25 ppm or more, do another 25 to 30% water change.",
      ...(nitrite || (t != null && t >= WATER.tempWarm)
        ? ["Add extra air: an air stone, or point the filter outflow at the surface. Nitrite and warm water both make it harder for fish to breathe."]
        : []),
      "Don't add anything to raise the pH right now, even if it reads low. Higher pH makes ammonia more toxic.",
      ...(lowPh || lowKh
        ? ["Once ammonia and nitrite read zero, then raise KH slowly: a little crushed coral in the filter, or baking soda at about 1 teaspoon per 50 gallons for each 1 dKH, no more than 1 dKH a day. pH will follow it up."]
        : []),
      "Check for anything dead or rotting (a missing fish, old food, a melting plant) and remove it. A bottled beneficial-bacteria product can help the cycle along, but it's optional.",
    ];

    plans.push({
      level: urgent ? "danger" : "warning",
      title: ammonia && nitrite ? "Your tank's cycle is behind" : nitrite ? "The last step of your cycle is behind" : "Your filter isn't keeping up with the waste",
      why: what + causes + nitrateNote + harshNote + bufferNote,
      steps,
      doneWhen:
        "Ammonia and nitrite both read zero for a full week, with a little nitrate showing. Then go back to normal feeding and a weekly 25% water change, and add new fish a few at a time.",
      covers: [
        "Ammonia",
        "Nitrite",
        ...(no3 != null && no3 > NITRATE_OK ? ["Nitrate"] : []),
        ...(lowPh ? ["pH"] : []),
        ...(lowKh ? ["KH"] : []),
      ],
    });
  }

  // Low pH with weak buffering is one problem: the buffer is used up, so pH sinks.
  // Not for soft-water fish that suit the low pH: for them it's the right water.
  if (ph != null && kh != null && kh < KH_LOW && ph < PH_SOFT_EDGE && !(ammonia || nitrite) && !phSuits) {
    plans.push({
      level: ph < PH_DANGER_LOW ? "danger" : "note",
      title: "Weak buffering is pulling your pH down",
      why:
        "Your low pH and low KH are the same issue. KH is the buffer that holds pH steady. As fish waste breaks down it slowly uses the buffer up, and once it's low the pH sinks and can drop suddenly, which is harder on fish than a steady low number.",
      steps: [
        ...(ph < PH_DANGER_LOW
          ? ["Do a 25% water change now and another tomorrow. Fresh tap water brings buffer back gently."]
          : []),
        "Raise KH slowly, not the pH directly. A small bag of crushed coral in the filter is the gentlest way.",
        "For faster results use baking soda, about 1 teaspoon per 50 gallons for each 1 dKH. Raise KH by no more than 1 dKH a day.",
        "Keep up regular water changes, which put buffer back each time.",
        "Test pH and KH every couple of days while you raise it.",
      ],
      doneWhen: "KH holds at 4 dKH or more and pH stays steady from one test to the next.",
      covers: ["pH", "KH"],
    });
  }

  return celsiusDeep(plans);
}


// ---------- Fishless cycle ----------
// With no fish in the tank the rules change: ammonia is food you add on
// purpose, nitrite is a sign of progress, and the only things that matter
// are what keeps the bacteria growing. Every card says why a reading is fine
// here, and readings that don't fit together get an explanation of what could
// cause them. Advice stays on the cautious side (dose to 2 ppm, not 4 or more).

const FISHLESS_DOSE = 2; // ppm of ammonia to feed the bacteria
const FISHLESS_REDOSE = 0.5; // dose back up once ammonia falls below this
const FISHLESS_AMMONIA_HIGH = 4; // above this, ammonia starts to hold the cycle back
const FISHLESS_NITRITE_HIGH = WATER.kitTopNitrite; // at the top of the chart, nitrite can stall it
const FISHLESS_PH_STALL = 6.5;
const FISHLESS_PH_STOP = 6.0;
const FISHLESS_PH_FREE_AMMONIA = 8.5; // above this, a full dose holds back the nitrite bacteria
const FISHLESS_TEMP_KILL = 95;

export function checkFishlessCycle(input: WaterReading): { result: WaterResult; plan: WaterPlan | null } {
  const { clean: reading, notices } = screenReading(input);
  // The nitrite card below already explains the top of the chart for a cycle.
  const f: WaterFinding[] = notices.filter((x) => !(x.parameter === "Nitrite" && !x.check));
  const a = has(reading.ammonia_ppm) ? reading.ammonia_ppm : null;
  const n = has(reading.nitrite_ppm) ? reading.nitrite_ppm : null;
  const no3 = has(reading.nitrate_ppm) ? reading.nitrate_ppm : null;
  const ph = has(reading.ph) ? reading.ph : null;
  const kh = has(reading.kh) ? reading.kh : null;
  const t = has(reading.temp_f) ? reading.temp_f : null;
  const nitrateSeen = (no3 ?? 0) > 0;
  const nitriteSeen = (n ?? 0) > 0;
  const highPh = ph != null && ph >= FISHLESS_PH_FREE_AMMONIA;

  if (a != null) {
    if (a > FISHLESS_AMMONIA_HIGH) {
      f.push({
        parameter: "Ammonia", level: "warning", value: fmt(a, " ppm"),
        title: "More ammonia than the bacteria need",
        whatsHappening:
          "With no fish, ammonia can't hurt anything, but this much can slow the cycle down. Very high ammonia holds back the bacteria that deal with nitrite, so the cycle drags on." +
          (highPh ? " Your high pH makes this worse, because more of it is in its harsher free form." : ""),
        howToFix: `Do a water change to bring it down to about ${FISHLESS_DOSE} ppm, and dose less next time. ${FISHLESS_DOSE} ppm is plenty.`,
      });
    } else if (a >= FISHLESS_DOSE && highPh) {
      f.push({
        parameter: "Ammonia", level: "note", value: fmt(a, " ppm"),
        title: "A full dose is harsh at this pH",
        whatsHappening:
          "At pH 8.5 and up, more of the ammonia is in its free form, which slows down the bacteria that turn nitrite into nitrate. The cycle still works, just slower in the nitrite stage.",
        howToFix: "Dose to about 1 ppm instead of 2 until nitrite starts falling.",
      });
    } else if (a > 0 && a < FISHLESS_REDOSE) {
      f.push({
        parameter: "Ammonia", level: "note", value: fmt(a, " ppm"),
        title: "Ammonia is nearly used up",
        whatsHappening:
          "The bacteria have eaten almost everything you gave them, which is progress, but they need a steady supply to keep growing." +
          (!nitriteSeen && !nitrateSeen
            ? " If a full dose dropped this far with no nitrite or nitrate showing at all, something other than the cycle may be taking it: live plants absorb ammonia, and an old nitrite or nitrate test can read zero. Check the dates on the bottles."
            : ""),
        howToFix: `Dose pure ammonia back up to about ${FISHLESS_DOSE} ppm.`,
      });
    } else if (a > 0) {
      f.push({
        parameter: "Ammonia", level: "ok", value: fmt(a, " ppm"),
        title: "Ammonia is fine during a fishless cycle",
        whatsHappening:
          "This is the food you add on purpose. The first group of bacteria eats ammonia and multiplies, and with no fish in the tank it can't harm anything.",
        howToFix: "Nothing to do. Let the bacteria work on it.",
      });
    } else {
      f.push({
        parameter: "Ammonia", level: nitriteSeen || nitrateSeen ? "ok" : "note", value: fmt(a, " ppm"),
        title: nitriteSeen || nitrateSeen ? "Ammonia is used up, a good sign" : "No ammonia yet",
        whatsHappening: nitriteSeen || nitrateSeen
          ? "The bacteria ate everything you gave them. That's exactly what you want to see."
          : "A fishless cycle needs ammonia to feed the bacteria. Without it, nothing grows.",
        howToFix: `Dose pure ammonia (no soap, scent or surfactant) up to about ${FISHLESS_DOSE} ppm.`,
      });
    }
  }

  if (n != null) {
    if (n >= FISHLESS_NITRITE_HIGH) {
      f.push({
        parameter: "Nitrite", level: "warning", value: fmt(n, " ppm"),
        title: n === FISHLESS_NITRITE_HIGH ? "Nitrite is at the top of the chart" : "Nitrite is high enough to stall the cycle",
        whatsHappening:
          (n === FISHLESS_NITRITE_HIGH
            ? `${FISHLESS_NITRITE_HIGH} ppm is the darkest colour on most nitrite kits, so the real number could be much higher. `
            : "") +
          `Some nitrite is normal now, but around ${FISHLESS_NITRITE_HIGH} ppm and up it slows the very bacteria that clear it, and the cycle can sit stuck for weeks. This usually happens from dosing more ammonia than the second group of bacteria can keep up with.`,
        howToFix:
          (n === FISHLESS_NITRITE_HIGH ? `${DILUTE} If it's above ${FISHLESS_NITRITE_HIGH}, ` : "") +
          "Do a 50% water change with dechlorinated water, then keep feeding ammonia at a smaller dose (1 ppm) until nitrite starts to fall.",
      });
    } else if (n > 0) {
      f.push({
        parameter: "Nitrite", level: "ok", value: fmt(n, " ppm"),
        title: "Nitrite is fine during a fishless cycle",
        whatsHappening:
          "Nitrite showing up is progress: the ammonia-eating bacteria are working and making it. The second group, which turns nitrite into nitrate, grows more slowly, so nitrite climbs for a while before it drops. With no fish, it harms nothing.",
        howToFix: "Nothing to do. This is usually the longest stage, often 2 to 4 weeks.",
      });
    } else {
      const mixed = nitrateSeen && (a ?? 0) > 0;
      f.push({
        parameter: "Nitrite", level: "ok", value: fmt(n, " ppm"),
        title: mixed ? "No nitrite showing" : nitrateSeen ? "Nitrite is at zero, the goal" : "No nitrite yet",
        whatsHappening: mixed
          ? "With ammonia still in the water and nitrate showing, zero nitrite can mean two different things. The plan above explains how to tell which."
          : nitrateSeen
          ? "Zero nitrite with nitrate showing usually means the second group of bacteria is keeping up."
          : "Normal early on. Nitrite usually appears after the first week or two, once the ammonia-eating bacteria get going.",
        howToFix: "Nothing to do.",
      });
    }
  }

  if (no3 != null) {
    // Most nitrate kits turn nitrate into nitrite to measure it, so nitrite already
    // in the water reads as nitrate too.
    const inflated =
      (n ?? 0) >= 1
        ? " While nitrite is high, this number reads high too: most nitrate tests also pick up nitrite, so part of it is really nitrite."
        : "";
    f.push(
      no3 > 0
        ? {
            parameter: "Nitrate", level: no3 > NITRATE_HIGH ? "note" : "ok", value: fmt(no3, " ppm"),
            title: no3 > NITRATE_HIGH ? "Nitrate is high, which is normal near the end" : "Nitrate is showing, a good sign",
            whatsHappening:
              "Nitrate is the end of the chain, so seeing it usually means the whole cycle is working. It builds up the longer you cycle, and it doesn't slow the bacteria." +
              inflated,
            howToFix: "Leave it for now. You'll do a big water change before any fish go in.",
          }
        : {
            parameter: "Nitrate", level: "ok", value: fmt(no3, " ppm"),
            title: "No nitrate yet",
            whatsHappening: "Normal until the second group of bacteria gets going. It shows up after nitrite does.",
            howToFix: "Nothing to do.",
          }
    );
  }

  if (ph != null) {
    f.push(
      ph < FISHLESS_PH_STOP
        ? {
            parameter: "pH", level: "warning", value: String(ph),
            title: "pH is low enough to stop the cycle",
            whatsHappening:
              "Below about 6 the bacteria stop working almost completely, so ammonia and nitrite just sit there. The cycle itself made the water this acidic: the bacteria use up the water's buffer (KH) as they work. This is the most common reason a cycle that was moving suddenly stops.",
            howToFix:
              "Raise KH and the pH comes with it: about 1 teaspoon of baking soda per 50 gallons raises KH by roughly 1 dKH. Raise it 1 to 2 dKH a day until pH sits at 7 or above. With no fish in the tank, this is safe to do.",
          }
        : ph < FISHLESS_PH_STALL
        ? {
            parameter: "pH", level: "warning", value: String(ph),
            title: "pH is low enough to slow the cycle",
            whatsHappening:
              "The cycle makes water more acidic as it runs, and the bacteria slow down a lot below about 6.5 and can stop near 6. This is one of the most common reasons a fishless cycle stalls.",
            howToFix:
              "Raise KH and the pH comes with it: about 1 teaspoon of baking soda per 50 gallons raises KH by roughly 1 dKH. Raise it 1 to 2 dKH a day until pH sits at 7 or above. With no fish in the tank, this is safe to do.",
          }
        : {
            parameter: "pH", level: ph > PH_HIGH ? "note" : "ok", value: String(ph),
            title: ph > PH_HIGH ? "pH is high but the bacteria cope" : "pH suits the bacteria",
            whatsHappening:
              ph > PH_HIGH
                ? "The bacteria do fine in hard, alkaline water, though a full ammonia dose is harsher on them up here. Just check it suits the fish you plan to keep."
                : "Cycle bacteria work best between about 7 and 8, and anything from 6.5 up keeps them going.",
            howToFix: "Nothing to do. Keep an eye on it, since the cycle slowly pulls pH down.",
          }
    );
  }

  if (t != null) {
    f.push(
      t > FISHLESS_TEMP_KILL
        ? {
            parameter: "Temperature", level: "warning", value: fmt(t, "°F"),
            title: "Hot enough to kill the bacteria",
            whatsHappening: "Above about 95°F the bacteria start to die off, and the cycle can go backwards. A heater stuck on is the usual cause.",
            howToFix: "Bring it down to about 80°F and check the heater's setting. If ammonia stops dropping afterwards, the bacteria took a hit; keep dosing and they'll regrow.",
          }
        : t > TEMP_HIGH
        ? {
            parameter: "Temperature", level: "warning", value: fmt(t, "°F"),
            title: "Too hot, even for cycling",
            whatsHappening: "Warm water speeds the bacteria up, but past the mid 80s it starts to work against them.",
            howToFix: "Bring it down to about 80°F.",
          }
        : t >= 78
        ? {
            parameter: "Temperature", level: "ok", value: fmt(t, "°F"),
            title: "Warm water speeds up the cycle",
            whatsHappening:
              "Cycle bacteria grow fastest in warm water, and with no fish you can run it warmer than you would later.",
            howToFix: "Nothing to do. Set the heater to suit your fish before they go in.",
          }
        : {
            parameter: "Temperature", level: "note", value: fmt(t, "°F"),
            title: "Cooler water means a slower cycle",
            whatsHappening:
              t < TEMP_LOW
                ? "This is cold for cycle bacteria. They grow very slowly, so the cycle can take months."
                : "The cycle still works, just more slowly than it would in warmer water.",
            howToFix: "Set a heater to about 80°F while you cycle. It can come down to suit your fish later.",
          }
    );
  }

  if (kh != null) {
    f.push(
      kh < KH_LOW
        ? {
            parameter: "KH", level: "warning", value: fmt(kh, " dKH"),
            title: "Low KH can crash the cycle",
            whatsHappening:
              "The bacteria use up KH as they work. Once it runs out, pH can suddenly drop and the cycle stops.",
            howToFix:
              "Raise it with baking soda, about 1 teaspoon per 50 gallons for each 1 dKH, no more than 1 to 2 dKH a day. Aim for 4 dKH or more and re-test every few days.",
          }
        : {
            parameter: "KH", level: "ok", value: fmt(kh, " dKH"),
            title: "Enough KH to keep the cycle going",
            whatsHappening: "The bacteria use up KH as they work, and you have enough buffer to keep pH steady.",
            howToFix: "Nothing to do. Re-test weekly, since cycling slowly uses it up.",
          }
    );
  }

  if (has(reading.gh)) {
    f.push({
      parameter: "GH", level: "ok", value: fmt(reading.gh, " dGH"),
      title: "Hardness doesn't affect the cycle",
      whatsHappening: "GH matters for the fish you choose later, not for the bacteria.",
      howToFix: "Nothing to do now. Check it suits the fish you plan to keep.",
    });
  }

  const status: WaterResult["status"] =
    f.length === 0 ? "empty" : f.some((x) => x.level === "warning") ? "warning" : "ok";

  // Where the cycle is, from the three nitrogen readings. When they don't fit
  // any one stage, the plan says so and explains what could cause it.
  let plan: WaterPlan | null = null;
  if (a != null || n != null || no3 != null) {
    const general = [
      "Keep the filter running day and night, and don't clean or replace the media. The bacteria live there.",
      "Keep the water around 78 to 82°F, and pH at 7 or above. If pH drops under 6.5, raise KH with a little baking soda (safe with no fish).",
      "Test every day or two and write the numbers down, so you can see the trend.",
    ];
    const doseStep = `Whenever ammonia falls below ${FISHLESS_REDOSE} ppm, dose pure ammonia back up to about ${FISHLESS_DOSE} ppm. Don't go higher; more doesn't make it faster.`;
    // A stalled cycle explains itself: the reading that's holding it up comes first.
    const stalledBy =
      ph != null && ph < FISHLESS_PH_STALL
        ? " Right now your low pH is the thing holding it up, so fix that first."
        : (n ?? 0) >= FISHLESS_NITRITE_HIGH
        ? " Right now your very high nitrite is holding it up, so bring that down first."
        : (a ?? 0) > FISHLESS_AMMONIA_HIGH
        ? " Right now too much ammonia is holding it up, so bring that down first."
        : "";

    if ((a ?? 0) === 0 && (n ?? 0) === 0 && nitrateSeen) {
      plan = {
        level: "note",
        title: "Nearly done: time for the 24-hour test",
        why:
          "Zero ammonia and zero nitrite with nitrate showing means both groups of bacteria are working. The last step is proving they can handle a full day's load quickly." +
          " One catch: if you haven't dosed any ammonia yet, this nitrate came from your tap water, not the cycle, and the cycle hasn't started. Test a glass of tap water to be sure.",
        steps: [
          `Dose ammonia to ${FISHLESS_DOSE} ppm, then test again 24 hours later.`,
          "If ammonia and nitrite both read zero after 24 hours, two days in a row, the tank is cycled.",
          "If either still shows, keep dosing and try the test again in a few days.",
          ...general,
        ],
        doneWhen: `${FISHLESS_DOSE} ppm of ammonia is gone, with zero nitrite, within 24 hours, two days running. Then do a big (about 75%) water change with dechlorinated, temperature-matched water to bring nitrate under 20 ppm, and add your first fish within a day or two, a few at a time. If the fish are delayed, keep dosing ammonia daily so the bacteria don't starve.`,
        covers: [],
      };
    } else if (nitriteSeen) {
      const noNitrateYet =
        no3 === 0
          ? " No nitrate yet is normal at this point, since the second group of bacteria is only just starting. If it still reads zero once nitrite starts falling, re-check your nitrate test: most liquid kits need the second bottle shaken hard for 30 seconds or more, or they read too low."
          : "";
      const ammoniaGone =
        a === 0
          ? " Your ammonia is already used up, so the first group of bacteria is doing well; just keep feeding them."
          : "";
      plan = {
        level: "note",
        title: "Stage 2: the nitrite stage",
        why:
          "Ammonia is being turned into nitrite, so the first group of bacteria is established. Now the second group, which turns nitrite into nitrate, has to grow. It's slower, so nitrite usually climbs for a while before it falls. This is normal and is often the longest part of the cycle." +
          ammoniaGone + noNitrateYet + stalledBy,
        steps: [
          doseStep,
          `Don't do water changes unless nitrite reaches ${FISHLESS_NITRITE_HIGH} ppm or ammonia goes above ${FISHLESS_AMMONIA_HIGH} ppm. Every other number is fine with no fish.`,
          ...general,
        ],
        doneWhen: "Nitrite starts falling and nitrate starts showing. Then you're close to the 24-hour test.",
        covers: [],
      };
    } else if ((a ?? 0) > 0 && nitrateSeen) {
      // Ammonia and nitrate but no nitrite doesn't fit one stage. Two common reasons.
      plan = {
        level: "note",
        title: "Mixed signals: ammonia and nitrate, but no nitrite",
        why:
          "This mix doesn't fit any one stage of the cycle, so one of two things is going on. If you've already seen nitrite rise and fall, you're near the end and probably tested too soon after dosing: the bacteria just haven't finished today's ammonia yet. If you've never seen nitrite, the nitrate is most likely coming from your tap water, and you're still in stage 1." +
          stalledBy,
        steps: [
          "Test a glass of tap water for nitrate. If it reads about the same as the tank, the nitrate is from your tap and you're in stage 1: keep dosing and wait for nitrite to show.",
          `If your tap water reads zero nitrate, you're close. Test ammonia and nitrite again 24 hours after your last dose. If both read zero, go on to the 24-hour test: dose to ${FISHLESS_DOSE} ppm and check it's gone a day later.`,
          doseStep,
          ...general,
        ],
        doneWhen: "You know which stage you're in: nitrite shows up (you're moving into stage 2), or a full dose is gone within 24 hours (you're nearly done).",
        covers: [],
      };
    } else if ((a ?? 0) > 0) {
      plan = {
        level: "note",
        title: "Stage 1: feeding the first bacteria",
        why:
          "The ammonia in the tank is food for the first group of bacteria. While they multiply, ammonia sits there with little or no nitrite. It's slow at first, often a week or two, and with no fish nothing is at risk." +
          stalledBy,
        steps: [
          ...((a ?? 0) > FISHLESS_AMMONIA_HIGH
            ? [`First, do a water change with dechlorinated water to bring ammonia down to about ${FISHLESS_DOSE} ppm. Too much ammonia slows the bacteria down. After that, don't do water changes; the ammonia is supposed to be there.`]
            : ["Don't do water changes. The ammonia is supposed to be there."]),
          doseStep,
          "A bottled beneficial-bacteria product can speed this stage up. It's optional.",
          ...general,
        ],
        doneWhen: "Nitrite shows up on your test. That's stage 2.",
        covers: [],
      };
    } else {
      plan = {
        level: "note",
        title: "Waiting for the cycle to start",
        why:
          "There's no ammonia yet, so there's nothing for the bacteria to eat. A fishless cycle needs a steady supply of ammonia." +
          " If you already dosed and it disappeared without any nitrite or nitrate showing, something else took it or the test missed it: live plants soak up ammonia directly, an expired test kit can read zero (check the date on the bottles), or the test was done before the dose mixed in. Wait an hour after dosing, then test.",
        steps: [`Dose pure ammonia (no soap, scent or surfactant) up to about ${FISHLESS_DOSE} ppm, and note how much it took.`, ...general],
        doneWhen: "Ammonia starts dropping on its own and nitrite appears.",
        covers: [],
      };
    }
  }

  return celsiusDeep({ result: { status, findings: f }, plan });
}
