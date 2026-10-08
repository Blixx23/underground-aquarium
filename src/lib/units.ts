/**
 * Temperatures: the database stores °F, always. These helpers add the °C
 * for display, so every page shows both the same way and nobody ever
 * converts by hand. One place to change if the format ever changes.
 */

/** °F to °C, whole degrees (aquarium ranges don't need decimals). */
export function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

/** °F to °C to one decimal, for a single measured reading (78.0°F = 25.6°C). */
export function fToC1(f: number): number {
  return Math.round((((f - 32) * 5) / 9) * 10) / 10;
}

const clean = (n: number) => String(Number(n.toFixed(1)));

/**
 * A temperature or range from the data, e.g. tempF(72, 80) = "72-80°F (22-27°C)"
 * and tempF(78) = "78°F (26°C)". Returns null when there's no number.
 */
export function tempF(lo: number | null | undefined, hi?: number | null): string | null {
  if (lo == null && hi == null) return null;
  const a = lo ?? hi!;
  const b = hi ?? lo!;
  if (a === b) return `${clean(a)}°F (${fToC(a)}°C)`;
  return `${clean(a)}-${clean(b)}°F (${fToC(a)}-${fToC(b)}°C)`;
}

/** A single reading someone typed in: "78°F (25.6°C)". */
export function readingF(f: number | null | undefined): string | null {
  return f == null || Number.isNaN(f) ? null : `${clean(f)}°F (${fToC1(f)}°C)`;
}

// "78°F", "72-80°F", "72–80°F", "72 to 80°F", "72 and 80°F", with an optional
// space before °F, not already followed by a °C conversion.
const IN_TEXT = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to|and)\s*(\d+(?:\.\d+)?))?\s?°F(?!\s*\(\s*-?\d[^)]*°C\))/g;

/**
 * Adds the °C to every °F written in a piece of text, so guides, care
 * sheets and tips need no edits: "Keep it at 76 to 80°F" becomes
 * "Keep it at 76 to 80°F (24-27°C)". Already-converted text is left alone.
 */
export function withCelsius(text: string): string;
export function withCelsius(text: null | undefined): null;
export function withCelsius(text: string | null | undefined): string | null;
export function withCelsius(text: string | null | undefined): string | null {
  if (text == null || !text.includes("°F")) return text ?? null;
  return text.replace(IN_TEXT, (all, a: string, b?: string) => {
    const lo = Number(a);
    if (b == null) return `${all} (${fToC(lo)}°C)`;
    return `${all} (${fToC(lo)}-${fToC(Number(b))}°C)`;
  });
}

/** withCelsius on every piece of text inside a result (findings, plans, issues). */
export function celsiusDeep<T>(value: T): T {
  if (typeof value === "string") return withCelsius(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => celsiusDeep(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = celsiusDeep(v);
    return out as T;
  }
  return value;
}
