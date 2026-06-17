// The platform fee charged on each sale, as a decimal.
// This is the SINGLE source of truth — change this one line and the
// whole site (checkout math, seller-facing text, payout breakdowns) updates.
export const PLATFORM_FEE_PERCENT = 0.05; // 0.05 = 5%

// A ready-to-display label built from the same value, so your text
// (e.g. "We take 5%") always matches the number you actually charge.
export const PLATFORM_FEE_LABEL = `${PLATFORM_FEE_PERCENT * 100}%`;

// How many days after a seller marks an order "shipped" we auto-release
// their payout, if the buyer hasn't already confirmed receipt.
// Change this one number to lengthen or shorten the safety window.
export const PAYOUT_AUTO_RELEASE_DAYS = 5;