import type { Species, StockItem } from "@/lib/tankBuilder/engine";

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
const NITRATE_OK = 20; // ppm; at/below = healthy
const NITRATE_WATCH = 40; // ppm; OK..here = plan a change soon
const NITRATE_HIGH = 80; // ppm; WATCH..here = warning, above = danger
const PH_LOW = 6.0;
const PH_HIGH = 8.4;
const TEMP_LOW = 66; // °F
const TEMP_HIGH = 86; // °F
const KH_LOW = 3; // dKH; below = weak buffering
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

  // ---------- Universal: cycle & toxicity (no fish needed) ----------

  // Ammonia — should be zero
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
        howToFix: "Nothing to do — keep up your regular maintenance.",
      });
    } else if (a < 0.25) {
      findings.push({
        parameter: "Ammonia",
        level: "warning",
        value: fmt(a, " ppm"),
        title: "Traces of ammonia",
        whatsHappening:
          "Ammonia is the waste fish and leftover food give off, and it's toxic even at low levels. A trace usually means the tank is still cycling, you're feeding a bit much, or the filter took a hit.",
        howToFix:
          "Do a 25–50% water change with dechlorinated water, ease off feeding for a day or two, and hold off adding fish until it reads zero.",
      });
    } else {
      findings.push({
        parameter: "Ammonia",
        level: "danger",
        value: fmt(a, " ppm"),
        title: "Ammonia is too high",
        whatsHappening:
          "Ammonia is toxic, and at this level it's actively stressing or chemically burning your fish. It means the tank can't process waste fast enough — most often an un-cycled new tank, overstocking, or overfeeding.",
        howToFix:
          "Do a large (50%) water change right now with dechlorinated water, and another tomorrow if it's still high. Stop feeding for a couple of days, add no fish, and a bottled beneficial-bacteria supplement can speed the cycle.",
      });
    }
  }

  // Nitrite — should be zero
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
    } else if (n < 0.25) {
      findings.push({
        parameter: "Nitrite",
        level: "warning",
        value: fmt(n, " ppm"),
        title: "Traces of nitrite",
        whatsHappening:
          "Nitrite is the middle step of the cycle and still toxic — it stops fish blood from carrying oxygen. Detecting it usually means a tank that's mid-cycle or a filter that was recently disturbed.",
        howToFix:
          "Do a 25–50% water change, hold off on feeding and new fish, and give the filter time. The cycle is done when ammonia and nitrite both sit at zero.",
      });
    } else {
      findings.push({
        parameter: "Nitrite",
        level: "danger",
        value: fmt(n, " ppm"),
        title: "Nitrite is too high",
        whatsHappening:
          "At this level nitrite is suffocating your fish — it blocks their blood from carrying oxygen, so you may see them gasping near the surface. The tank isn't fully cycled, or the filter has crashed.",
        howToFix:
          "Large (50%) water change now, and again tomorrow if needed. Stop feeding, add no new fish, and consider a beneficial-bacteria supplement.",
      });
    }
  }

  // Nitrate — accumulates; lower is better
  if (has(reading.nitrate_ppm)) {
    const n = reading.nitrate_ppm;
    if (n <= NITRATE_OK) {
      findings.push({
        parameter: "Nitrate",
        level: "ok",
        value: fmt(n, " ppm"),
        title: "Nitrate is in a healthy range",
        whatsHappening:
          "Nitrate is the harmless end-product of the cycle, and yours is low — a sign of a well-maintained tank.",
        howToFix: "Nothing to do — your water-change routine is working.",
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
          "A 25–30% water change brings it down. Live plants also soak up nitrate if you want a longer-term buffer.",
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
          "Do a 30–50% water change now, then get on a regular weekly schedule. Easing off feeding and adding live plants both help.",
      });
    } else {
      findings.push({
        parameter: "Nitrate",
        level: "danger",
        value: fmt(n, " ppm"),
        title: "Nitrate is very high",
        whatsHappening:
          "This is high enough to make fish chronically unwell. It needs to come down gradually — one huge change when nitrate is very high can shock fish, because the swing itself is stressful.",
        howToFix:
          "Do a couple of 30% changes a day or two apart rather than one massive one, then commit to weekly changes. Check whether the tank is overstocked or overfed.",
      });
    }
  }

  // pH — universal extremes only; the right number depends on the fish
  if (has(reading.ph)) {
    const p = reading.ph;
    if (p >= PH_LOW && p <= PH_HIGH) {
      findings.push({
        parameter: "pH",
        level: "ok",
        value: String(p),
        title: "pH is in a normal freshwater range",
        whatsHappening:
          "This pH is fine for a broad range of community fish. What matters more than the exact number is that it stays steady and suits the species you keep.",
        howToFix:
          "Nothing needed — and avoid chasing a 'perfect' number with chemicals, since a stable pH beats a textbook one.",
      });
    } else if (p < PH_LOW) {
      findings.push({
        parameter: "pH",
        level: "warning",
        value: String(p),
        title: "pH is on the low (acidic) side",
        whatsHappening:
          "A low pH can stress fish that prefer neutral or hard water, and very low readings can even stall your biological filter. It's often caused by soft tap water, driftwood, or a depleted buffer (low KH).",
        howToFix:
          "Don't jolt it back up — adjust slowly. A little crushed coral in the filter raises it gently over time. Check your KH too; weak buffering is usually the real cause.",
      });
    } else {
      findings.push({
        parameter: "pH",
        level: "warning",
        value: String(p),
        title: "pH is on the high (alkaline) side",
        whatsHappening:
          "A high pH suits hard-water fish like livebearers and African cichlids but is rough on soft-water fish like tetras and many catfish. It usually reflects hard tap water or rocks/substrate that raise it.",
        howToFix:
          "Easiest fix is matching fish to your water rather than fighting it. To lower it gently, driftwood or peat help — avoid sudden chemical swings.",
      });
    }
  }

  // Temperature — universal extremes only; ideal depends on the fish
  if (has(reading.temp_f)) {
    const t = reading.temp_f;
    if (t < TEMP_LOW) {
      findings.push({
        parameter: "Temperature",
        level: "warning",
        value: fmt(t, "°F"),
        title: "Water is cold",
        whatsHappening:
          "Most tropical fish slow down, stop eating, and get more disease-prone below the low 70s. Coldwater fish like goldfish are fine here; tropicals aren't.",
        howToFix:
          "If you keep tropical fish, add or turn up a heater and raise it a couple of degrees at a time toward 76–78°F.",
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
          "Cool it gradually — a fan across the surface, a partial cooler-water change, or lifting the lid. Bring it down slowly; sudden swings are worse than the heat itself.",
      });
    }
    // Comfortable band: no universal flag; fish-fit (below) handles specifics.
  }

  // KH — buffering / pH stability
  if (has(reading.kh) && reading.kh < KH_LOW) {
    findings.push({
      parameter: "KH (buffer)",
      level: "note",
      value: fmt(reading.kh, " dKH"),
      title: "Low carbonate hardness — pH can swing",
      whatsHappening:
        "KH is your water's buffer; it's what keeps pH steady. When it's this low, pH can drift or crash between water changes, which is harder on fish than a stable 'wrong' pH.",
      howToFix:
        "A small amount of crushed coral in the filter, or a pinch of baking soda, raises KH and steadies your pH. Go slowly and re-test.",
    });
  }

  // ---------- Fish-fit: do your numbers suit your stock? ----------
  // Reuses the preferred ranges already stored on each species.
  const species: Species[] = stock.map((s) => s.species);

  // pH fit
  if (has(reading.ph)) {
    const withPh = species.filter((s) => s.ph_min != null && s.ph_max != null);
    if (withPh.length > 0) {
      const lo = Math.max(...withPh.map((s) => s.ph_min as number));
      const hi = Math.min(...withPh.map((s) => s.ph_max as number));
      if (lo <= hi && (reading.ph < lo || reading.ph > hi)) {
        findings.push({
          parameter: "pH vs. your fish",
          level: "warning",
          value: String(reading.ph),
          title: "pH doesn't match your stocked fish",
          whatsHappening: `Your reading is ${reading.ph}, but the fish you've added overlap best around ${lo}–${hi}. Outside that window they're workable but less comfortable and more prone to stress.`,
          howToFix:
            "Adjust slowly with natural methods (crushed coral to raise, driftwood/peat to lower) — or, honestly, the calmest path is keeping fish that already suit your tap water. Steady beats perfect.",
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
      if (lo <= hi && (reading.temp_f < lo || reading.temp_f > hi)) {
        findings.push({
          parameter: "Temperature vs. your fish",
          level: "warning",
          value: fmt(reading.temp_f, "°F"),
          title: "Temperature doesn't match your stocked fish",
          whatsHappening: `Your reading is ${reading.temp_f}°F, but your fish overlap best between ${lo}–${hi}°F. Too far off and they get sluggish, stop eating, or get stressed.`,
          howToFix:
            "Nudge the heater a degree or two at a time until you're inside that range — never a big jump at once.",
        });
      }
    }
  }

  // (Hardness fit is intentionally left out for now — see note below.)

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