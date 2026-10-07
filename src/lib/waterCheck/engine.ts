import type { Species, StockItem } from "@/lib/tankBuilder/engine";
import { WATER, CARE } from "@/lib/data/facts";

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
const TEMP_LOW = WATER.tempLow;
const TEMP_HIGH = WATER.tempHigh;
const TEMP_COOL = WATER.tempCool;
const TEMP_WARM = WATER.tempWarm;
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

export function checkWater(
  reading: WaterReading,
  stock: StockItem[] = []
): WaterResult {
  const findings: WaterFinding[] = [];
  const species: Species[] = stock.map((s) => s.species);
  // True when fish are entered and every one of them is comfortable at this value,
  // e.g. a goldfish tank at 65°F or a blackwater tank at pH 5.8. Then a general
  // "unusual" reading is only a note, not a warning.
  const stockSuits = (minKey: "ph_min" | "temp_min_f", maxKey: "ph_max" | "temp_max_f", v: number) =>
    species.length > 0 &&
    species.every((s) => s[minKey] != null && s[maxKey] != null && v >= (s[minKey] as number) && v <= (s[maxKey] as number));
  // Ammonia is far more toxic in alkaline or warm water.
  const harshWater = (has(reading.ph) && reading.ph >= WATER.ammoniaHarshPh) || (has(reading.temp_f) && reading.temp_f >= WATER.ammoniaHarshTemp);

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
          "Even a trace of ammonia is urgent here. At a pH of 7.8 or higher, or in warm water, much more of it is in its toxic form, so a reading that would be a warning in soft, cool water can burn gills.",
        howToFix:
          "Do a 50% water change now with dechlorinated water, then test again. Stop feeding for a day or two, add no fish, and keep changing water until ammonia reads zero.",
      });
    } else if (a < TOXIC_DANGER) {
      findings.push({
        parameter: "Ammonia",
        level: "warning",
        value: fmt(a, " ppm"),
        title: "Traces of ammonia",
        whatsHappening:
          "Ammonia is the waste fish and leftover food give off, and it's toxic even at low levels. A trace usually means the tank is still cycling, you're feeding a bit much, or the filter took a hit.",
        howToFix:
          "Do a 25-50% water change with dechlorinated water, ease off feeding for a day or two, and hold off adding fish until it reads zero.",
      });
    } else {
      findings.push({
        parameter: "Ammonia",
        level: "danger",
        value: fmt(a, " ppm"),
        title: "Ammonia is too high",
        whatsHappening:
          "Ammonia is toxic, and at this level it's actively stressing or chemically burning your fish. It means the tank can't process waste fast enough, most often because of an un-cycled new tank, overstocking, or overfeeding.",
        howToFix:
          "Do a large (50%) water change right now with dechlorinated water, and another tomorrow if it's still high. Stop feeding for a couple of days, add no fish, and a bottled beneficial-bacteria supplement can speed the cycle.",
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
          "Do a 30-50% water change now, then get on a regular weekly schedule. Easing off feeding and adding live plants both help.",
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
    if (p >= PH_LOW && p <= PH_HIGH) {
      if (p < PH_SOFT_EDGE) {
        findings.push({
          parameter: "pH",
          level: "note",
          value: String(p),
          title: "pH is on the soft, acidic side",
          whatsHappening:
            "This sits at the acidic end of the normal range. It's ideal for soft-water fish like tetras, rasboras, and most South American species, but a bit low for hard-water fish like livebearers and African cichlids. What matters most is that it stays steady.",
          howToFix:
            "Nothing urgent. If your fish prefer harder water, raise it slowly with a little crushed coral, and check your KH, since weak buffering is the usual cause of a drifting low pH.",
        });
      } else if (p > PH_HARD_EDGE) {
        findings.push({
          parameter: "pH",
          level: "note",
          value: String(p),
          title: "pH is on the hard, alkaline side",
          whatsHappening:
            "This sits at the alkaline end of the normal range. It's great for livebearers, goldfish, and African cichlids, but a bit high for soft-water fish like tetras and many catfish.",
          howToFix:
            "Nothing urgent. If your fish prefer softer water, driftwood or peat lower it gently over time. Avoid sudden chemical swings.",
        });
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
      findings.push({
        parameter: "pH",
        level: stockSuits("ph_min", "ph_max", p) ? "note" : "warning",
        value: String(p),
        title: "pH is on the low (acidic) side",
        whatsHappening:
          "A low pH can stress fish that prefer neutral or hard water, and very low readings can even stall your biological filter. It's often caused by soft tap water, driftwood, or a depleted buffer (low KH).",
        howToFix:
          "Don't jolt it back up. Adjust slowly. A little crushed coral in the filter raises it gently over time. Check your KH too; weak buffering is usually the real cause.",
      });
    } else {
      findings.push({
        parameter: "pH",
        level: stockSuits("ph_min", "ph_max", p) ? "note" : "warning",
        value: String(p),
        title: "pH is on the high (alkaline) side",
        whatsHappening:
          "A high pH suits hard-water fish like livebearers and African cichlids but is rough on soft-water fish like tetras and many catfish. It usually reflects hard tap water or rocks/substrate that raise it.",
        howToFix:
          "Easiest fix is matching fish to your water rather than fighting it. To lower it gently, driftwood or peat help. Avoid sudden chemical swings.",
      });
    }
  }

  // Temperature: universal extremes only; ideal depends on the fish
  if (has(reading.temp_f)) {
    const t = reading.temp_f;
    if (t < TEMP_LOW) {
      findings.push({
        parameter: "Temperature",
        level: stockSuits("temp_min_f", "temp_max_f", t) ? "note" : "warning",
        value: fmt(t, "°F"),
        title: "Water is cold",
        whatsHappening:
          "Most tropical fish slow down, stop eating, and get more disease-prone below the low 70s. Coldwater fish like goldfish are fine here; tropicals aren't.",
        howToFix:
          `If you keep tropical fish, add or turn up a heater and raise it a couple of degrees at a time toward ${HEAT}°F.`,
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
    } else if (t < TEMP_COOL) {
      findings.push({
        parameter: "Temperature",
        level: "note",
        value: fmt(t, "°F"),
        title: "Water is on the cool side",
        whatsHappening:
          "Comfortable for coldwater fish like goldfish, and the cooler end for many tropicals. Most tropical community fish are happiest a few degrees warmer.",
        howToFix:
          `If you keep tropicals, nudge a heater up toward ${HEAT}°F a degree at a time. Coldwater setups are fine as-is.`,
      });
    } else if (t > TEMP_WARM) {
      findings.push({
        parameter: "Temperature",
        level: "note",
        value: fmt(t, "°F"),
        title: "Water is on the warm side",
        whatsHappening:
          "Fine for many fish but toward the warm end. Warm water holds less oxygen, so keep an eye out for fish hanging near the surface.",
        howToFix:
          "No action needed unless fish look stressed. To cool it, do so gradually. A fan across the surface helps more than ice.",
      });
    } else {
      findings.push({
        parameter: "Temperature",
        level: "ok",
        value: fmt(t, "°F"),
        title: "Temperature is in a comfortable range",
        whatsHappening:
          "A solid middle-of-the-road temperature for most tropical community fish.",
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
  if (has(reading.kh) && reading.kh >= KH_LOW) {
    findings.push({
      parameter: "KH",
      level: "ok",
      value: fmt(reading.kh, " dKH"),
      title: "KH is holding your pH steady",
      whatsHappening: "Enough buffer that your pH shouldn't swing between water changes.",
      howToFix: "Nothing to do.",
    });
  }
  if (has(reading.kh) && reading.kh < KH_LOW) {
    findings.push({
      parameter: "KH",
      level: "note",
      value: fmt(reading.kh, " dKH"),
      title: "Low carbonate hardness, so pH can swing",
      whatsHappening:
        "KH is your water's buffer; it's what keeps pH steady. When it's this low, pH can drift or crash between water changes, which is harder on fish than a stable 'wrong' pH.",
      howToFix:
        "A small amount of crushed coral in the filter raises KH and steadies your pH. Baking soda works faster: about 1 teaspoon per 50 gallons raises KH by roughly 1 dKH. Raise it no more than 1 to 2 dKH a day, and re-test.",
    });
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
  const enteredAnything =
    has(reading.temp_f) ||
    has(reading.ph) ||
    has(reading.ammonia_ppm) ||
    has(reading.nitrite_ppm) ||
    has(reading.nitrate_ppm) ||
    has(reading.gh) ||
    has(reading.kh);

  let status: WaterResult["status"] = "empty";
  if (enteredAnything) {
    if (findings.some((f) => f.level === "danger")) status = "danger";
    else if (findings.some((f) => f.level === "warning")) status = "warning";
    else status = "ok";
  }

  return { status, findings };
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

export function waterPlans(reading: WaterReading): WaterPlan[] {
  const plans: WaterPlan[] = [];
  const a = has(reading.ammonia_ppm) ? reading.ammonia_ppm : null;
  const n = has(reading.nitrite_ppm) ? reading.nitrite_ppm : null;
  const no3 = has(reading.nitrate_ppm) ? reading.nitrate_ppm : null;
  const ph = has(reading.ph) ? reading.ph : null;
  const kh = has(reading.kh) ? reading.kh : null;
  const t = has(reading.temp_f) ? reading.temp_f : null;

  const ammonia = (a ?? 0) > 0;
  const nitrite = (n ?? 0) > 0;
  if (ammonia || nitrite) {
    const harsh = (ph != null && ph >= WATER.ammoniaHarshPh) || (t != null && t >= WATER.ammoniaHarshTemp);
    const worst = Math.max(a ?? 0, n ?? 0);
    const urgent = worst >= TOXIC_DANGER || (ammonia && harsh);
    const veryHighNitrate = no3 != null && no3 > NITRATE_HIGH;

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

    const changeStep = urgent
      ? veryHighNitrate
        ? "Do a 25% water change now and another 25% a few hours later, rather than one big one. Match the new water's temperature to the tank and treat it with dechlorinator first."
        : "Do a 50% water change now. Match the new water's temperature to the tank and treat it with dechlorinator first. If the tank hasn't had a water change in a month or more, split it into two 25% changes a few hours apart so the fish aren't shocked."
      : "Do a 25 to 30% water change today. Match the new water's temperature to the tank and treat it with dechlorinator first.";

    const steps = [
      changeStep,
      "Use a water conditioner that says it detoxifies ammonia and nitrite. It makes them safer for about a day while the bacteria catch up, but it doesn't remove them, so keep testing.",
      "Stop feeding for a day or two, then feed a small amount every other day until the readings are back to zero. Less food means less ammonia.",
      "Don't add any fish, and don't clean, rinse in tap water or replace the filter media. The bacteria you need live there. If the filter is clogged, swish it gently in a bucket of old tank water.",
      "Test ammonia and nitrite every day. Whenever ammonia and nitrite together reach 0.25 ppm or more, do another 25 to 30% water change.",
      ...(nitrite || (t != null && t >= WATER.tempWarm)
        ? ["Add extra air: an air stone, or point the filter outflow at the surface. Nitrite and warm water both make it harder for fish to breathe."]
        : []),
      "Don't add anything to raise the pH right now, even if it reads low. Higher pH makes ammonia more toxic.",
      "Check for anything dead or rotting (a missing fish, old food, a melting plant) and remove it. A bottled beneficial-bacteria product can help the cycle along, but it's optional.",
    ];

    plans.push({
      level: urgent ? "danger" : "warning",
      title: ammonia && nitrite ? "Your tank's cycle is behind" : nitrite ? "The last step of your cycle is behind" : "Your filter isn't keeping up with the waste",
      why: what + causes + nitrateNote + harshNote,
      steps,
      doneWhen:
        "Ammonia and nitrite both read zero for a full week, with a little nitrate showing. Then go back to normal feeding and a weekly 25% water change, and add new fish a few at a time.",
      covers: ["Ammonia", "Nitrite", ...(no3 != null && no3 > NITRATE_OK ? ["Nitrate"] : [])],
    });
  }

  // Low pH with weak buffering is one problem: the buffer is used up, so pH sinks.
  if (ph != null && kh != null && kh < KH_LOW && ph < PH_SOFT_EDGE && !(ammonia || nitrite)) {
    plans.push({
      level: "note",
      title: "Weak buffering is pulling your pH down",
      why:
        "Your low pH and low KH are the same issue. KH is the buffer that holds pH steady. As fish waste breaks down it slowly uses the buffer up, and once it's low the pH sinks and can drop suddenly, which is harder on fish than a steady low number.",
      steps: [
        "Raise KH slowly, not the pH directly. A small bag of crushed coral in the filter is the gentlest way.",
        "For faster results use baking soda, about 1 teaspoon per 50 gallons for each 1 dKH. Raise KH by no more than 1 dKH a day.",
        "Keep up regular water changes, which put buffer back each time.",
        "Test pH and KH every couple of days while you raise it.",
      ],
      doneWhen: "KH holds at 4 dKH or more and pH stays steady from one test to the next.",
      covers: ["pH", "KH"],
    });
  }

  return plans;
}
