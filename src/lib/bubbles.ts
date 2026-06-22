// Bubble reputation tiers — a 21-rung ladder from the surface to the deep.
// `min` is the floor of each tier; a member's tier is the highest one whose
// `min` they've reached. The top rung is intentionally very hard to reach.
// Colors use Tailwind tokens (default palette + the custom `ocean`).
export type BubbleTier = {
  name: string;
  min: number;
  color: string;
  rank: number;
};

const RAW: { name: string; min: number; color: string }[] = [
  { name: "Tide Pool", min: 0, color: "text-ocean-400" },
  { name: "Shallows", min: 25, color: "text-sky-400" },
  { name: "Kelp Forest", min: 75, color: "text-teal-300" },
  { name: "Reef Flat", min: 150, color: "text-cyan-300" },
  { name: "Lagoon", min: 300, color: "text-emerald-300" },
  { name: "Coral Reef", min: 500, color: "text-emerald-400" },
  { name: "Drop-off", min: 800, color: "text-green-300" },
  { name: "Open Water", min: 1200, color: "text-sky-300" },
  { name: "Blue Hole", min: 1800, color: "text-blue-300" },
  { name: "Continental Shelf", min: 2500, color: "text-indigo-300" },
  { name: "Twilight Zone", min: 3500, color: "text-indigo-400" },
  { name: "Mesopelagic", min: 5000, color: "text-violet-300" },
  { name: "The Deep", min: 7000, color: "text-violet-400" },
  { name: "Midnight Zone", min: 10000, color: "text-purple-300" },
  { name: "Bathypelagic", min: 14000, color: "text-purple-400" },
  { name: "The Trench", min: 20000, color: "text-fuchsia-300" },
  { name: "Abyssal Plain", min: 30000, color: "text-pink-300" },
  { name: "Abyssopelagic", min: 45000, color: "text-rose-300" },
  { name: "Hadal Zone", min: 65000, color: "text-amber-300" },
  { name: "The Mariana", min: 90000, color: "text-amber-400" },
  { name: "Leviathan", min: 125000, color: "text-yellow-300" },
];

export const BUBBLE_TIERS: BubbleTier[] = RAW.map((t, i) => ({
  ...t,
  rank: i + 1,
}));

export const TIER_COUNT = BUBBLE_TIERS.length;

export function bubbleTier(balance: number): BubbleTier {
  let current = BUBBLE_TIERS[0];
  for (const tier of BUBBLE_TIERS) {
    if (balance >= tier.min) current = tier;
  }
  return current;
}

export function nextBubbleTier(balance: number): BubbleTier | null {
  for (const tier of BUBBLE_TIERS) {
    if (tier.min > balance) return tier;
  }
  return null;
}
