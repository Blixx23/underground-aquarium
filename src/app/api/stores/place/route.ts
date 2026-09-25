import { NextResponse } from "next/server";
import { usPlaces, type UsPlace } from "@/lib/stores/usPlaces";
import { normalise, withinDistance } from "@/lib/stores/search";

const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY",
  louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};
const CODES = new Set(Object.values(STATES));

/** Split "carmichael ca" / "Carmichael, California" into the place and an optional state. */
function parse(q: string): { place: string; state: string | null } {
  const n = normalise(q);
  for (const [name, code] of Object.entries(STATES)) {
    if (n.endsWith(" " + name)) return { place: n.slice(0, -name.length - 1).trim(), state: code };
  }
  const words = n.split(" ");
  const last = words[words.length - 1]?.toUpperCase();
  if (words.length > 1 && last && CODES.has(last)) return { place: words.slice(0, -1).join(" "), state: last };
  return { place: n, state: null };
}

/**
 * A town or city someone typed into the shop search, even misspelled:
 * "carmciahel" finds Carmichael, CA. Used when no shop matches, so the
 * page can show the nearest shops instead of "nothing found".
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  // Where the visitor roughly is, to settle ties ("springfield" near them, not in Oregon).
  const [nLat, nLng] = (url.searchParams.get("near") ?? "").split(",").map(Number);
  const near = Number.isFinite(nLat) && Number.isFinite(nLng) ? { lat: nLat, lng: nLng } : null;
  const far = (p: UsPlace) => (near ? (p.lat - near.lat) ** 2 + (p.lng - near.lng) ** 2 : 0);
  const { place, state } = parse(q);
  if (place.length < 3) return NextResponse.json({ best: null, others: [] });

  const squashed = place.replace(/ /g, "");
  const limit = squashed.length >= 8 ? 2 : squashed.length >= 5 ? 1 : 0;
  const scored: { p: UsPlace; s: number }[] = [];

  for (const p of usPlaces()) {
    if (state && p.state !== state) continue;
    const name = normalise(p.name);
    const flat = name.replace(/ /g, "");
    let s = -1;
    if (name === place || flat === squashed) s = 0;
    else if (squashed.length >= 4 && flat.startsWith(squashed)) s = 1;
    else if (limit > 0 && Math.abs(flat.length - squashed.length) <= limit) {
      if (withinDistance(squashed, flat, 1)) s = 2;
      else if (limit >= 2 && withinDistance(squashed, flat, 2)) s = 3;
    }
    if (s >= 0) scored.push({ p, s });
  }

  scored.sort((a, b) => a.s - b.s || far(a.p) - far(b.p) || a.p.name.length - b.p.name.length || a.p.name.localeCompare(b.p.name));
  const top = scored.slice(0, 6).map(({ p }) => p);

  return NextResponse.json(
    { best: top[0] ?? null, others: top.slice(1) },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
