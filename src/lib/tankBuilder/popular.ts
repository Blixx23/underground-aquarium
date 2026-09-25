import type { Species } from "@/lib/tankBuilder/engine";

/**
 * Names people actually search for and keep, most popular first. Used to put
 * familiar fish at the top of suggestions and size guides instead of
 * whatever comes first alphabetically.
 */
const POPULAR = [
  "neon tetra",
  "cardinal tetra",
  "betta",
  "guppy",
  "corydoras",
  "bronze cory",
  "panda cory",
  "platy",
  "molly",
  "zebra danio",
  "harlequin rasbora",
  "ember tetra",
  "cherry shrimp",
  "otocinclus",
  "bristlenose pleco",
  "honey gourami",
  "dwarf gourami",
  "pearl gourami",
  "kuhli loach",
  "angelfish",
  "german blue ram",
  "bolivian ram",
  "rummy nose tetra",
  "cherry barb",
  "white cloud",
  "chili rasbora",
  "swordtail",
  "black skirt tetra",
  "tiger barb",
  "amano shrimp",
  "nerite snail",
  "mystery snail",
  "clown loach",
  "boesemani rainbow",
  "discus",
  "kribensis",
  "apistogramma",
  "glowlight tetra",
  "lemon tetra",
  "black neon tetra",
  "congo tetra",
  "pygmy cory",
  "hatchetfish",
  "pencilfish",
  "endler",
  "rosy barb",
  "gold barb",
  "odessa barb",
  "silver dollar",
  "goldfish",
  "oscar",
  "yellow lab",
];

function match(s: Pick<Species, "common_name">): { i: number; exact: boolean } {
  const n = s.common_name.toLowerCase();
  const exact = POPULAR.indexOf(n);
  if (exact !== -1) return { i: exact, exact: true };
  const i = POPULAR.findIndex((p) => n.startsWith(p + " ") || n.endsWith(" " + p) || n.includes(p));
  return { i, exact: false };
}

/** Lower is more popular. An exact name ("Neon Tetra") beats a variant ("Black Neon Tetra"). */
export function popularityRank(s: Pick<Species, "common_name">): number {
  const m = match(s);
  return m.i === -1 ? 999 : m.i * 2 + (m.exact ? 0 : 1);
}

/** Which popular fish this is a kind of, so variants of one fish can be told apart from different fish. */
export function popularityKey(s: Pick<Species, "common_name" | "slug">): string {
  const m = match(s);
  return m.i === -1 ? s.slug : POPULAR[m.i];
}

export function byPopularity<T extends Pick<Species, "common_name">>(a: T, b: T): number {
  return popularityRank(a) - popularityRank(b) || a.common_name.localeCompare(b.common_name);
}
