import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GEOCODE_SECRET = process.env.GEOCODE_SECRET;

type RegionRow = {
  id: string;
  state_code: string;
  state_name: string;
  name: string;
};

/**
 * Region names are display labels, not places Nominatim knows.
 * "Fresno / Madera" is two towns; "Killeen / Temple / Ft Hood" is three.
 * Take the first one and ask about that.
 */
function buildQuery(r: RegionRow): string {
  const first = r.name.split("/")[0].trim();
  // A handful of names are the whole state ("Maine", "Hawaii"), which
  // geocodes fine on its own.
  if (first.toLowerCase() === r.state_name.toLowerCase()) {
    return `${r.state_name}, USA`;
  }
  return `${first}, ${r.state_name}, USA`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!GEOCODE_SECRET || url.searchParams.get("key") !== GEOCODE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Nominatim asks for about one request a second, so a run of 200 takes
  // roughly 3.7 minutes. That fits inside maxDuration with room to spare.
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 1),
    240
  );

  const { data, error } = await supabaseAdmin
    .from("market_regions")
    .select("id, state_code, state_name, name")
    .is("lat", null)
    .order("state_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const regions = (data ?? []) as RegionRow[];

  let geocoded = 0;
  let missed = 0;
  const misses: string[] = [];

  for (const r of regions) {
    const q = buildQuery(r);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(
          q
        )}`,
        {
          headers: {
            "User-Agent": "UndergroundAquarium/1.0 (region geocoder)",
          },
        }
      );
      const json = (await res.json()) as { lat: string; lon: string }[];
      if (json.length > 0) {
        await supabaseAdmin
          .from("market_regions")
          .update({
            lat: parseFloat(json[0].lat),
            lng: parseFloat(json[0].lon),
          })
          .eq("id", r.id);
        geocoded++;
      } else {
        missed++;
        misses.push(`${r.name} (${r.state_code})`);
      }
    } catch {
      missed++;
      misses.push(`${r.name} (${r.state_code}) — request failed`);
    }
    await sleep(1100);
  }

  const { count: remaining } = await supabaseAdmin
    .from("market_regions")
    .select("id", { count: "exact", head: true })
    .is("lat", null);

  return NextResponse.json({
    processed: regions.length,
    geocoded,
    missed,
    stillMissingCoordinates: remaining ?? 0,
    misses: misses.slice(0, 40),
  });
}
