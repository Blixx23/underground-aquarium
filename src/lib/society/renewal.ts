import { SOCIETY_CLUB_PATH } from "@/lib/config";

// ============================================================
// SOCIETY RENEWAL RULES
//
// One place that decides "can this member renew yet?" so the
// member area, the membership page, the checkout route and the
// reminder emails all agree. Plain functions with no database or
// browser code, so both server and client components can use them.
// ============================================================

// Members can renew any time in the last 30 days before their
// paid-through date (and any time after it passes). Paying early
// never costs them days: the Stripe webhook extends from the
// current paid-through date, not from the day they pay.
export const RENEWAL_WINDOW_DAYS = 30;

// Where every "Renew now" button and reminder email points. The
// ?renew=1 flag keeps the membership page from bouncing a member in
// good standing back to the member area before they can pay.
export const SOCIETY_RENEW_PATH = `${SOCIETY_CLUB_PATH}?renew=1#renew`;

// Where members change their details or leave the Society.
export const SOCIETY_MANAGE_PATH = `${SOCIETY_CLUB_PATH}?manage=1`;

/**
 * Whole days from today until a paid-through date ("YYYY-MM-DD").
 * 0 means it expires today, negative means it has already passed.
 * Counted in UTC days, the same way the reminder cron counts them,
 * so the banner and the emails never disagree by one.
 */
export function daysUntilPaidThrough(
  paidThrough: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!paidThrough) return null;
  const pt = Date.parse(`${paidThrough}T00:00:00Z`);
  if (Number.isNaN(pt)) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((pt - today) / 86400000);
}

/**
 * Where a paid-through date stands:
 *  - "none":     never paid (a newly approved member).
 *  - "current":  paid, more than 30 days left. Nothing to do yet.
 *  - "expiring": 30 days or fewer left. Renewal is open.
 *  - "lapsed":   the date has passed.
 */
export type RenewalState = "none" | "current" | "expiring" | "lapsed";

export function renewalState(
  paidThrough: string | null | undefined,
  now: Date = new Date()
): RenewalState {
  const days = daysUntilPaidThrough(paidThrough, now);
  if (days === null) return "none";
  if (days < 0) return "lapsed";
  if (days <= RENEWAL_WINDOW_DAYS) return "expiring";
  return "current";
}

/**
 * The paid-through date a member will have after paying for one more
 * year, as "YYYY-MM-DD". Mirrors the Society dues branch of the Stripe
 * webhook so the page can promise the exact date the payment buys:
 *  - never paid: one year from today.
 *  - paid up (early renewal): one year on top of the current date.
 *  - lapsed: the anniversary rolls forward to the next one after today,
 *    so the renewal date stays the same every year.
 */
export function nextPaidThrough(
  paidThrough: string | null | undefined,
  months = 12,
  now: Date = new Date()
): string {
  const addMonths = (d: Date, n: number) => {
    const out = new Date(d);
    out.setUTCMonth(out.getUTCMonth() + n);
    return out;
  };
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  if (!paidThrough) return addMonths(today, months).toISOString().slice(0, 10);

  const anchor = new Date(`${paidThrough}T00:00:00Z`);
  if (anchor >= today) return addMonths(anchor, months).toISOString().slice(0, 10);

  let covers = new Date(anchor);
  while (covers <= today) covers = addMonths(covers, months);
  return covers.toISOString().slice(0, 10);
}

/** "October 4, 2026" from "2026-10-04", without a time zone shift. */
export function formatPaidThrough(paidThrough: string): string {
  return new Date(`${paidThrough}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
