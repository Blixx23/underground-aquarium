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

// Society dues. The one paid thing on the site: membership in the
// Underground Aquarium Society, collected through Stripe Connect.
// (The constant keeps its old name because the dues tables, RPCs and
// API routes underneath are still the club machinery — the Society is
// simply the only tenant now.)
export const CLUB_DUES_ENABLED: boolean = true;

// ============================================================
// THE SOCIETY
//
// undergroundaquarium.com used to host many clubs. It now IS one
// society, national, with no chapters. These constants are the single
// source of truth for its name and where it lives.
// ============================================================

export const SOCIETY_NAME = "Underground Aquarium Society";
export const SOCIETY_SHORT_NAME = "the Society";

// The row in `clubs` that is the Society. Its member area is /c/<slug>.
export const SOCIETY_SLUG = "underground-aquarium-society";

// The public front door people are linked to from nav, footer and home.
export const SOCIETY_PATH = "/society";

// Where the Society's member area lives (roster, dues, BAP/HAP, events).
export const SOCIETY_HOME_PATH = `/c/${SOCIETY_SLUG}`;

// ============================================================
// BUILD-ORDER SWITCHES
//
// These exist so a half-built feature never shows a button that
// goes nowhere. Each one flips to true in the step that ships it.
// ============================================================

// On-site buyer/seller messaging. Shipped in Step 5.
export const MESSAGING_ENABLED: boolean = true;

// The /my/listings manager: publish, renew, mark sold, edit, delete.
// Shipped in Step 6.
export const MY_LISTINGS_ENABLED: boolean = true;

// ============================================================
// FREE CLASSIFIEDS SETTINGS
// ============================================================

// Where "sell something" sends people now that listings are free.
export const POST_AD_PATH = "/post";

// How long a free classified ad stays up before it expires.
// Mirrors the 45-day default in the listings table.
export const LISTING_LIFETIME_DAYS = 45;

// ============================================================
// LEGACY PAID SETTINGS
//
// Still used by Society dues and by any paid order winding down.
// They have no effect on free classified listings.
// ============================================================

// The platform takes nothing. Underground Aquarium is free to use:
// no listing fees, no commission, no cut of Society dues.
// Kept as a constant only because the Society dues checkout and the
// wind-down code still read it. Already-placed orders use the fee
// that was stored on the order at the time, so this does not change them.
export const PLATFORM_FEE_PERCENT = 0;

// A ready-to-display label built from the same value.
export const PLATFORM_FEE_LABEL = `${PLATFORM_FEE_PERCENT * 100}%`;

// How many days after a seller marks an order "shipped" we auto-release
// their payout, if the buyer hasn't already confirmed receipt.
export const PAYOUT_AUTO_RELEASE_DAYS = 5;

// Flat markup on every shipping label, in cents. Zero — we don't
// mark up shipping either.
export const SHIPPING_LABEL_FEE_CENTS = 0;
