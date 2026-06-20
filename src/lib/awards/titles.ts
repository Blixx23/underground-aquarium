export type AwardTitle = { title: string; min_points: number };

// Returns the highest-tier title the given points qualify for, or null.
// Robust to unordered or partially-malformed ladders.
export function titleForPoints(
  points: number,
  ladder: AwardTitle[] | null | undefined
): string | null {
  if (!ladder || ladder.length === 0) return null;
  let best: AwardTitle | null = null;
  for (const tier of ladder) {
    if (
      tier &&
      typeof tier.min_points === "number" &&
      points >= tier.min_points &&
      (!best || tier.min_points > best.min_points)
    ) {
      best = tier;
    }
  }
  return best ? best.title : null;
}
