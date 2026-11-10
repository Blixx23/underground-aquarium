/**
 * Where a featured shop goes in a list: after the 3rd item, then every
 * `every` items after that. Short lists get one after their last item.
 * Returns which shop (0 = nearest) to show after item `i`, or null.
 */
export function featuredSlotAfter(i: number, total: number, every = 6): number | null {
  if (total < 3) return i === total - 1 ? 0 : null;
  if (i < 2 || (i - 2) % every !== 0) return null;
  return (i - 2) / every;
}
