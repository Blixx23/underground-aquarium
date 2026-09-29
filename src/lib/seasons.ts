/**
 * Seasonal themes, on a schedule.
 *
 * Each theme has a start and end date (month-day, inclusive, Pacific time)
 * and turns itself on and off every year. A window can wrap the new year
 * (Dec 1 to Feb 28). When no window matches, the site uses its normal look.
 *
 * To add a theme: add an entry to SEASONS with its dates and classes.
 * To test one early: set NEXT_PUBLIC_SEASON_OVERRIDE=frost in .env.local
 * (or "off" to switch all themes off). Remove it to go back to the schedule.
 *
 * Class names are full strings on purpose: Tailwind only builds classes it
 * can read in the source, and this file is in its content list.
 */

export type SeasonId = "pumpkin" | "frost" | "blossom";

export type Motif = "pumpkin" | "snowflake" | "blossom";

export type Season = {
  id: SeasonId;
  label: string;
  /** "MM-DD", inclusive. */
  start: string;
  end: string;
  motif: Motif;
  /** Homepage hero. */
  hero: {
    /** Second, warm glow layered under the blue light. */
    glow: string;
    /** Gradient on "fish store." */
    headline: string;
    /** 1px frame around the search box. */
    searchFrame: string;
    /** Tint for the small motif by the badge. */
    motifColor: string;
  };
  /** Feed "Create a post" box. */
  composer: {
    /** Extra classes on the card. */
    card: string;
    /** Thin line along the top of the card. */
    topLine: string;
    motifColor: string;
    /** Word added to the prompt: "What's happening in your tanks this fall, Chris?" */
    promptSuffix: string;
  };
};

export const SEASONS: Season[] = [
  {
    id: "pumpkin",
    label: "Fall",
    start: "09-20",
    end: "11-30",
    motif: "pumpkin",
    hero: {
      glow: "radial-gradient(closest-side, rgba(251,146,60,0.16), rgba(217,119,6,0.07) 50%, transparent 80%)",
      headline: "from-sky-300 via-amber-200 to-orange-400",
      searchFrame: "from-sky-400/40 via-amber-300/30 to-orange-400/70",
      motifColor: "text-orange-300/80",
    },
    composer: {
      card: "border-orange-400/40",
      topLine: "via-orange-300/60",
      motifColor: "text-orange-300/80",
      promptSuffix: " this fall",
    },
  },
  {
    id: "frost",
    label: "Winter",
    start: "12-01",
    end: "02-28",
    motif: "snowflake",
    hero: {
      glow: "radial-gradient(closest-side, rgba(224,242,254,0.10), rgba(186,230,253,0.05) 50%, transparent 80%)",
      headline: "from-sky-200 via-slate-100 to-cyan-100",
      searchFrame: "from-sky-300/40 via-white/20 to-cyan-200/40",
      motifColor: "text-sky-100/80",
    },
    composer: {
      card: "border-sky-200/20",
      topLine: "via-sky-100/40",
      motifColor: "text-sky-100/80",
      promptSuffix: " this winter",
    },
  },
  {
    id: "blossom",
    label: "Spring",
    start: "03-20",
    end: "05-31",
    motif: "blossom",
    hero: {
      glow: "radial-gradient(closest-side, rgba(244,114,182,0.08), rgba(190,24,93,0.04) 50%, transparent 80%)",
      headline: "from-sky-300 via-cyan-200 to-pink-200",
      searchFrame: "from-sky-400/40 via-cyan-300/20 to-pink-300/40",
      motifColor: "text-pink-200/80",
    },
    composer: {
      card: "border-pink-200/20",
      topLine: "via-pink-200/40",
      motifColor: "text-pink-200/80",
      promptSuffix: " this spring",
    },
  },
];

/** Today's month-day in Pacific time, as "MM-DD". */
function monthDay(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${m}-${d}`;
}

function inWindow(md: string, start: string, end: string): boolean {
  // "MM-DD" strings compare correctly as text.
  if (start <= end) return md >= start && md <= end;
  // Window wraps the new year, e.g. 12-01 to 02-28.
  return md >= start || md <= end;
}

/** The theme showing right now, or null for the normal look. */
export function currentSeason(now: Date = new Date()): Season | null {
  const override = process.env.NEXT_PUBLIC_SEASON_OVERRIDE?.trim();
  if (override === "off") return null;
  if (override) return SEASONS.find((s) => s.id === override) ?? null;

  const md = monthDay(now);
  return SEASONS.find((s) => inWindow(md, s.start, s.end)) ?? null;
}
