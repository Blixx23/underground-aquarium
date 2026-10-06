// Kept apart from membership.ts (which needs a signed-in request) so public
// pages and client components can use the ladder too.

/**
 * Difficulty class from a species' point value.
 *
 * The point value is the source of truth — the class letter is a label put
 * on top of it. Anything off the published ladder falls back to its own
 * point count rather than being forced into the nearest letter.
 */
export const CLASS_LADDER: { letter: string; points: number; blurb: string }[] = [
  { letter: "A", points: 5, blurb: "Beginner. Breeds readily in a community tank." },
  { letter: "B", points: 10, blurb: "Straightforward with a dedicated tank." },
  { letter: "C", points: 15, blurb: "Needs conditioning and specific water." },
  { letter: "D", points: 20, blurb: "Difficult. Fry are the hard part." },
  { letter: "E", points: 25, blurb: "Expert. Few members will log one." },
  { letter: "F", points: 40, blurb: "Rarely bred in captivity at all." },
];

export function classForPoints(points: number): string | null {
  return CLASS_LADDER.find((c) => c.points === points)?.letter ?? null;
}
