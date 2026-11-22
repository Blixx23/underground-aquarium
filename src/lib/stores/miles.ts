/**
 * One way to write a distance between places, used everywhere shops are
 * compared, so the same shop never shows as "14 mi" here and "14.4 mi" there.
 * Two shops in the same spot (a shared address or city centre) say "Same area"
 * instead of a puzzling "0.0 mi".
 */
export function milesLabel(d: number): string {
  if (d < 0.3) return "Same area";
  return d < 10 ? `${d.toFixed(1)} mi` : `${Math.round(d)} mi`;
}
