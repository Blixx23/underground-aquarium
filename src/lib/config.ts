// ============================================================
// SITE MODE SWITCHES
//
// Underground Aquarium is a FREE classifieds site. The paid
// marketplace code is still here, just switched off. Flip a
// switch back to true and that half of the site wakes up.
//
// The types are written as `: boolean` on purpose. Without that,
// TypeScript narrows the value to the literal `false` and then
// complains that every `if` checking it is always false.
// ============================================================

// Master switch for the PAID marketplace: Stripe checkout, seller
// payout onboarding, the buy button, the paid sell flow.
// false = nobody can start a new paid transaction.
export const PAID_MARKETPLACE_ENABLED: boolean = false;

// Lets orders that were ALREADY paid for finish their life:
// mark shipped, buy a label, buyer confirms receipt, payout
// releases, Stripe webhook keeps listening.
// Keep this true until every open order has cleared, then set it
// to false. Turning this off early strands money mid-flight.
export const PAID_ORDER_WINDDOWN_ENABLED: boolean = true;

// Club dues are a separate business from the marketplace and stay
// live. Clubs still collect dues through Stripe Connect.
export const CLUB_DUES_ENABLED: boolean = true;

// Where "sell something" sends people now that listings are free.
// Step 4 builds /post — change this one line then.
export const POST_AD_PATH = "/marketplace";

// How long a free classified ad stays up before it expires.
// Mirrors the 45-day default in the listings table.
export const LISTING_LIFETIME_DAYS = 45;

// ============================================================
// LEGACY PAID SETTINGS
//
// Still used by club dues and by any paid order winding down.
// They have no effect on free classified listings.
// ============================================================

// The platform fee charged on each sale, as a decimal.
export const PLATFORM_FEE_PERCENT = 0.05; // 0.05 = 5%

// A ready-to-display label built from the same value.
export const PLATFORM_FEE_LABEL = `${PLATFORM_FEE_PERCENT * 100}%`;

// How many days after a seller marks an order "shipped" we auto-release
// their payout, if the buyer hasn't already confirmed receipt.
export const PAYOUT_AUTO_RELEASE_DAYS = 5;

// Flat markup on every shipping label, in cents. 150 = $1.50.
export const SHIPPING_LABEL_FEE_CENTS = 150;
