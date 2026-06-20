// Canonical marketplace categories — the single source of truth.
// The database stores the `key`; the UI shows the `label`.
// To add/rename a category later, edit this list only.

export type Category = { key: string; label: string };

export const CATEGORIES: Category[] = [
  { key: "plants", label: "Aquatic Plants" },
  { key: "equipment", label: "Equipment" },
  { key: "tanks", label: "Tanks & Stands" },
  { key: "hardscape", label: "Hardscape & Aquascaping" },
  { key: "food", label: "Food & Water Care" },
  { key: "tools", label: "Tools & Maintenance" },
  { key: "diy", label: "DIY & 3D-Printed" },
  { key: "other", label: "Other" },
];

const LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);

// Turn a stored key into a display label (falls back to "Other").
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return "Other";
  return LABELS[key] ?? "Other";
}
