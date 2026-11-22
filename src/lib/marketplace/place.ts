/**
 * Sellers type their town however they like ("green bay", "BEREA"). Show it
 * tidy: words capitalized when the seller typed it all one case, otherwise
 * as typed (so "McKinney" and "DeLand" stay right).
 */
export function tidyCity(city: string | null | undefined): string {
  const c = (city ?? "").trim().replace(/\s+/g, " ");
  if (!c) return "";
  if (c !== c.toLowerCase() && c !== c.toUpperCase()) return c;
  return c
    .toLowerCase()
    .replace(/(^|[\s\-'.])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** "Berea, KY". The state always shows so a town name is never a guess. */
export function cityState(city: string | null | undefined, state: string | null | undefined): string {
  const c = tidyCity(city);
  const s = (state ?? "").trim().toUpperCase();
  return [c, s].filter(Boolean).join(", ");
}
