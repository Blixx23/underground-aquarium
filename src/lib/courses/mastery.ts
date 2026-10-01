/**
 * Mastery exams: one long, timed, graded-once test that unlocks only after
 * every course it covers is complete.
 *
 * Shared by the server (unlock checks, grading) and the browser (labels,
 * timer), so nothing in here touches the database.
 */
export const MASTERY_SLUG = "foundations-mastery";

export function isMasterySlug(slug: string | null | undefined): boolean {
  return slug === MASTERY_SLUG;
}

/** Pass mark, unless the course row sets its own pass_percent. */
export const MASTERY_PASS_PERCENT = 90;
/** Time allowed once the exam starts. */
export const MASTERY_TIME_LIMIT_MIN = 120;
/** Wait after a failed attempt before trying again. */
export const MASTERY_COOLDOWN_HOURS = 24;
/** Submissions this long after the timer ends are still accepted (slow networks). */
export const MASTERY_GRACE_SECONDS = 120;

export const MASTERY_TOPICS: Record<string, string> = {
  setup: "Tank setup & care",
  cycle: "The nitrogen cycle",
  stocking: "Choosing fish",
  chemistry: "Water chemistry",
  health: "Fish health",
  buying: "Buying healthy fish",
  plants: "Live plants",
};

/** Deterministic shuffle so a refreshed exam keeps the same order. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
