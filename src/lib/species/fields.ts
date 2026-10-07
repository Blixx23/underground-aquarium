/** The choices on the species care form, shared by the admin form and the AI check. */
export const SPECIES_OPTIONS = {
  water_type: ["Freshwater", "Brackish"],
  temperament: ["Peaceful", "Semi-aggressive", "Aggressive"],
  social: ["Schooling", "Groups", "Social", "Pairs", "Solitary", "Colony", "Harem"],
  swim_level: ["Top", "Mid-top", "Middle", "Mid-bottom", "Bottom", "All"],
  diet: ["Omnivore", "Carnivore", "Herbivore"],
  care_level: ["Beginner", "Intermediate", "Advanced", "Expert"],
  suitability: ["Common", "Intermediate", "Advanced", "Expert", "Kept but not recommended"],
  breeding_type: [
    "Egg-scatterer",
    "Egg-depositor",
    "Egg-layer",
    "Substrate spawner",
    "Cave spawner",
    "Mouthbrooder",
    "Bubble-nester",
    "Livebearer",
    // Shrimp, crayfish and crabs: the female carries the eggs under her tail.
    "Egg carrier",
  ],
  // Yes/No on the form; saved as true/false. The Tank Builder warns with these.
  fin_nipper: ["No", "Yes"],
  plant_safe: ["Yes", "No"],
} as const;

/** Every field on the "Add to library" form. */
export const SPECIES_FIELDS = [
  "common_name",
  "scientific_name",
  "group_name",
  "water_type",
  "temp_min_f",
  "temp_max_f",
  "ph_min",
  "ph_max",
  "gh_min",
  "gh_max",
  "max_size_in",
  "min_tank_gal",
  "temperament",
  "social",
  "min_group_size",
  "swim_level",
  "diet",
  "care_level",
  "suitability",
  "breeding_type",
  "fin_nipper",
  "plant_safe",
  "lifespan",
  "family",
  "origin",
  "summary",
  "body",
] as const;

export type SpeciesField = (typeof SPECIES_FIELDS)[number];

/** What the AI check decided about a species request. */
export type AiVerdict = "already_listed" | "another_name" | "too_broad" | "add_variant" | "add_new" | "turn_down" | "unsure";

export type AiReview = {
  verdict: AiVerdict;
  confidence: "high" | "medium" | "low";
  /** What the member most likely meant. */
  identified_as: { common_name: string | null; scientific_name: string | null };
  /** Two to four sentences for the admin. */
  summary: string;
  /** Library fish that matter here, checked against the real library. */
  matches: { slug: string; common_name: string; relation: string; why: string }[];
  /** For another_name: the fish to add the name to. */
  alias_slug: string | null;
  /** For add_variant: the library species it's a color or fin form of. */
  parent_slug?: string | null;
  /** One plain sentence: what the AI recommends Chris does. Missing on checks from before Oct 2026. */
  recommendation?: string | null;
  /** True once a second, separate pass has fact-checked the care form. */
  checked_twice?: boolean;
  /** What the second pass corrected, in plain words. */
  corrections?: string[];
  /** Fields left blank on purpose, and why. */
  blank_reasons?: Partial<Record<SpeciesField, string>>;
  /** For already_listed, too_broad, turn_down: the reason the member will see. */
  member_reason: string | null;
  /** For add_new and add_variant: the filled-in care form. */
  species: Partial<Record<SpeciesField, string>> | null;
  /** Anything the admin should double-check. */
  double_check: string[];
  model: string;
  cost_cents: number;
  checked_at: string;
};
