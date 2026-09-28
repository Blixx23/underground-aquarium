// Canonical classifieds categories: the single source of truth.
// The database stores the `key`; the UI shows the `label`.
// To add/rename a category later, edit this list only.

export type Category = {
  key: string;
  label: string;
  /** Short line shown on the category tiles. */
  blurb: string;
};

export const CATEGORIES: Category[] = [
  {
    key: "livestock-freshwater",
    label: "Freshwater Fish",
    blurb: "Community fish, cichlids, bettas, fry",
  },
  {
    key: "livestock-saltwater",
    label: "Saltwater & Coral",
    blurb: "Reef fish, frags, colonies, live rock",
  },
  {
    key: "livestock-inverts",
    label: "Shrimp, Snails & Inverts",
    blurb: "Neocaridina, caridina, nerites, crabs",
  },
  {
    key: "plants",
    label: "Aquatic Plants",
    blurb: "Trimmings, rare stems, tissue culture",
  },
  {
    key: "tanks",
    label: "Tanks & Stands",
    blurb: "Glass, acrylic, rimless, stands, lids",
  },
  {
    key: "equipment",
    label: "Filters, Lights & Equipment",
    blurb: "Canisters, lights, heaters, CO2, pumps",
  },
  {
    key: "hardscape",
    label: "Hardscape & Decor",
    blurb: "Driftwood, stone, substrate, backgrounds",
  },
  {
    key: "food-care",
    label: "Food & Water Care",
    blurb: "Frozen, live cultures, ferts, test kits",
  },
  {
    key: "diy",
    label: "DIY & 3D-Printed",
    blurb: "Homemade gear, printed parts, tools",
  },
  {
    key: "free",
    label: "Free Stuff",
    blurb: "Giveaways, extra fry, spare gear",
  },
  {
    key: "wanted",
    label: "Wanted / ISO",
    blurb: "Looking for something specific",
  },
  {
    key: "other",
    label: "Everything Else",
    blurb: "Anything that doesn't fit above",
  },
];

const LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);

/** Turn a stored key into a display label (falls back to "Everything Else"). */
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return "Everything Else";
  return LABELS[key] ?? "Everything Else";
}

/** True if the key is one we actually recognise. */
export function isValidCategory(key: string | null | undefined): boolean {
  return !!key && key in LABELS;
}

/**
 * "Free" and "Wanted" are really ad types, not just categories. When someone
 * posts, they pick a category (say, Freshwater Fish) AND whether the ad is for
 * sale, free, or wanted, which is saved as listings.is_free / is_wanted. So a
 * free betta lives in "livestock-freshwater" with is_free = true, and would
 * never show under the Free Stuff category if we only looked at the category.
 *
 * These helpers treat an ad as belonging to its own category, plus Free Stuff
 * when is_free is true, plus Wanted / ISO when is_wanted is true.
 */
type CategorizedAd = {
  category: string | null;
  is_free?: boolean | null;
  is_wanted?: boolean | null;
};

/** Every category key an ad should appear under (no duplicates). */
export function listingCategoryKeys(ad: CategorizedAd): string[] {
  const keys = new Set<string>([ad.category ?? "other"]);
  if (ad.is_free) keys.add("free");
  if (ad.is_wanted) keys.add("wanted");
  return [...keys];
}

/** True if the ad should show when filtering by this category key. */
export function listingInCategory(ad: CategorizedAd, key: string): boolean {
  return listingCategoryKeys(ad).includes(key);
}
