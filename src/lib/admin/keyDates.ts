/** Key dates: renewals and deadlines on Admin > Dashboard > Key dates. */

export type KeyDate = {
  id: string;
  title: string;
  due_on: string; // YYYY-MM-DD
  category: string;
  notes: string | null;
  link: string | null;
  repeat_months: number | null;
  remind_days: number;
  remind_on: string;
  done_at: string | null;
  last_done_at: string | null;
};

export const KEY_DATE_CATEGORIES = [
  { key: "legal", label: "Legal" },
  { key: "domain", label: "Domain & hosting" },
  { key: "money", label: "Money & taxes" },
  { key: "society", label: "Society" },
  { key: "other", label: "Other" },
] as const;

export const categoryLabel = (key: string) =>
  KEY_DATE_CATEGORIES.find((c) => c.key === key)?.label ?? "Other";

/** Today's date in Los Angeles, as YYYY-MM-DD. */
export function todayLA(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

/** Whole days from today (LA) to a YYYY-MM-DD date. Negative = overdue. */
export function daysUntil(date: string, today = todayLA()): number {
  const a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const b = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** YYYY-MM-DD plus a number of days (negative allowed). */
export function addDays(date: string, days: number): string {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD plus months, keeping the day where it can (Jan 31 + 1 month = Feb 28). */
export function addMonths(date: string, months: number): string {
  const y = +date.slice(0, 4);
  const m = +date.slice(5, 7) - 1 + months;
  const day = +date.slice(8, 10);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last))).toISOString().slice(0, 10);
}

export function longDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "in 12 days", "tomorrow", "today", "3 days overdue", "in 2 years". */
export function countdown(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "1 day overdue";
  if (days < 0) return `${-days} days overdue`;
  if (days < 60) return `in ${days} days`;
  if (days < 730) return `in ${Math.round(days / 30.44)} months`;
  return `in ${(days / 365.25).toFixed(1).replace(/\.0$/, "")} years`;
}
