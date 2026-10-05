/** Renewals: everything that expires (domains, the DMCA agent, subscriptions). Admin > Dashboard > Renewals. */

export type Renewal = {
  id: string;
  name: string;
  kind: string;
  provider: string | null;
  account: string | null;
  expires_on: string | null; // YYYY-MM-DD
  renew_months: number | null;
  auto_renew: boolean | null;
  cost_cents: number | null;
  remind_days: number;
  remind_on: string | null;
  link: string | null;
  notes: string | null;
};

export const RENEWAL_KINDS = [
  { key: "domain", label: "Domain" },
  { key: "legal", label: "Legal" },
  { key: "subscription", label: "Subscription" },
  { key: "hosting", label: "Hosting" },
  { key: "license", label: "License" },
  { key: "other", label: "Other" },
] as const;

export const kindLabel = (key: string) => RENEWAL_KINDS.find((k) => k.key === key)?.label ?? "Other";

/** Today's date in Los Angeles, as YYYY-MM-DD. */
export function todayLA(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

const utc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

/** Whole days from today (LA) to a YYYY-MM-DD date. Negative = expired. */
export function daysUntil(date: string, today = todayLA()): number {
  return Math.round((utc(date) - utc(today)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const d = new Date(utc(date));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Months later, keeping the day where it can (Jan 31 + 1 month = Feb 28). */
export function addMonths(date: string, months: number): string {
  const y = +date.slice(0, 4);
  const m = +date.slice(5, 7) - 1 + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(+date.slice(8, 10), last))).toISOString().slice(0, 10);
}

export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "12 days", "3 months", "2.5 years", "expired 4 days ago". */
export function timeLeft(days: number): string {
  if (days < 0) return days === -1 ? "expired yesterday" : `expired ${-days} days ago`;
  if (days === 0) return "expires today";
  if (days < 60) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 730) return `${Math.round(days / 30.44)} months`;
  return `${(days / 365.25).toFixed(1).replace(/\.0$/, "")} years`;
}

export function money(cents: number | null): string {
  if (cents === null) return "";
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

export function every(months: number | null): string {
  if (!months) return "";
  if (months % 12 === 0) return months === 12 ? "yearly" : `every ${months / 12} years`;
  return months === 1 ? "monthly" : `every ${months} months`;
}
