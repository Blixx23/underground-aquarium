/**
 * Glossary addresses that point at another term: near-duplicates folded into
 * one page (step72 SQL), plus the other names people type into a URL or link
 * with ("white-spot" is ich). Old links keep working and their ranking moves
 * to the page that covers the topic.
 */
export const GLOSSARY_ALIASES: Record<string, string> = {
  // Merged near-duplicates
  "quarantine-tank": "quarantine",
  acclimate: "acclimation",
  "cycling-a-tank": "cycling",
  "hardscape-scape": "hardscape",
  "nitrifying-bacteria": "beneficial-bacteria",
  "partial-water-change": "water-change",
  // Other names for the same thing
  "white-spot": "ich",
  "white-spot-disease": "ich",
  "tail-rot": "fin-rot",
  "mouth-fungus": "columnaris",
  "brown-algae": "diatoms",
  "blue-green-algae": "cyanobacteria",
  bba: "black-beard-algae",
  alkalinity: "kh",
  "carbonate-hardness": "kh",
  "general-hardness": "gh",
  "water-hardness": "gh",
  popeye: "pop-eye",
  "swim-bladder": "swim-bladder-disorder",
  "water-conditioner": "dechlorinator",
  "cloudy-water": "bacterial-bloom",
  ostracods: "seed-shrimp",
  hlle: "hole-in-the-head",
};
