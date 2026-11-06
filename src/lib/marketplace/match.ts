/**
 * How classified alerts and Wanted posts are matched to ads. Plain word
 * matching, forgiving of plurals, so "cherry shrimp" finds "Cherry Shrimp x20"
 * and "oscars" finds "Oscar". Shared by the matching job and the alert form's
 * preview, so both agree.
 */

// Words that say nothing about what's being bought or sold.
const STOP = new Set([
  "the", "and", "for", "with", "from", "near", "any", "some", "all", "one", "two", "few", "lot", "lots",
  "wtb", "iso", "want", "wanted", "wants", "looking", "look", "need", "needed", "buy", "buying", "sell", "selling",
  "sale", "free", "cheap", "obo", "pick", "pickup", "local", "only", "please", "used", "new", "good", "great",
  "condition", "price", "each", "per", "set", "pair", "this", "that", "have", "has", "will", "can", "not",
]);

// Short forms people use for the same thing.
const SAME: Record<string, string> = { gal: "gallon", gallons: "gallon", gals: "gallon", lbs: "lb", pleco: "plecostomus" };

/** Lowercase words of 3+ letters and numbers of 2+ digits ("75" gallon), plurals folded ("snails" -> "snail"). */
export function words(text: string | null | undefined): string[] {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => (/^\d+$/.test(w) ? w.length >= 2 : w.length >= 3))
    .map((w) => SAME[w] ?? w)
    .map((w) => (/^\d+$/.test(w) ? w : w.endsWith("ies") ? w.slice(0, -3) + "y" : w.endsWith("es") && w.length > 4 ? w.slice(0, -2) : w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/** The words that carry meaning: no filler, no duplicates. */
export function keywords(text: string | null | undefined): string[] {
  return [...new Set(words(text).filter((w) => !STOP.has(w)))];
}

/** Every alert word appears in the ad (title or description). An empty alert matches everything. */
export function alertMatches(query: string | null | undefined, ad: { title: string; description: string | null }): boolean {
  const need = keywords(query);
  if (need.length === 0) return true;
  const have = new Set(words(`${ad.title} ${ad.description ?? ""}`));
  return need.every((w) => have.has(w));
}

/**
 * A Wanted post and an ad look like the same thing: at least two of the
 * Wanted title's meaningful words appear in the ad, or its only one does.
 */
export function wantedMatches(wantedTitle: string, ad: { title: string; description: string | null }): boolean {
  const need = keywords(wantedTitle);
  if (need.length === 0) return false;
  const have = new Set(words(`${ad.title} ${ad.description ?? ""}`));
  const hits = need.filter((w) => have.has(w)).length;
  return hits >= Math.min(2, need.length);
}

/** Straight-line miles between two points. */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Radius choices on the alert form, in miles. */
export const ALERT_RADII = [25, 50, 100, 150] as const;
export const MAX_ALERTS_PER_MEMBER = 10;
/** Wanted posts and ads further apart than this aren't matched. */
export const WANTED_RADIUS_MILES = 60;
