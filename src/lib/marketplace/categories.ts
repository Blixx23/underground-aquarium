// Canonical classifieds categories — the single source of truth.
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
