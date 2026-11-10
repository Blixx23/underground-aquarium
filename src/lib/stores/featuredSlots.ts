/**
 * Where a featured shop goes in a list. Placed early so people see it
 * without scrolling: right after the first item, then every `every` items.
 * Returns which shop (0 = nearest) to show after item `i`, or null.
 */
export function featuredSlotAfter(i: number, _total: number, every = 6): number | null {
  if (i % every !== 0) return null;
  return i / every;
}
