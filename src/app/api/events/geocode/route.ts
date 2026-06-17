import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GEOCODE_SECRET = process.env.GEOCODE_SECRET;

type EventRow = {
  id: string;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

// Build a geocodable query from whatever location parts we have.
// Needs at least an address or a city, or there's no point asking.
function buildQuery(e: EventRow): string | null {
  if (!e.address && !e.city) return null;
  const parts = [e.address || e.venue_name, e.city, e.state, e.postal_code].filter(
    (p): p is string => !!p && p.trim().length > 0
  );
  if (parts.length === 0) return null;
  return parts.join(", ") + ", USA";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!GEOCODE_SECRET || url.searchParams.get("key") !== GEOCODE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In-person events that don't have coordinates yet (max 8 per run to be polite)
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, venue_name, address, city, state, postal_code")
    .is("lat", null)
    .eq("is_online", false)
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (data ?? []) as EventRow[];
  const results: {
    id: string;
    status: string;
    lat?: number;
    lng?: number;
    query?: string;
  }[] = [];

  for (const e of events) {
    const q = buildQuery(e);
    if (!q) {
      results.push({ id: e.id, status: "skipped-no-location" });
      continue;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          q
        )}`,
        {
          headers: {
            "User-Agent": "UndergroundAquarium/1.0 (events geocoder)",
          },
        }
      );
      const json = (await res.json()) as { lat: string; lon: string }[];
      if (json.length > 0) {
        const lat = parseFloat(json[0].lat);
        const lng = parseFloat(json[0].lon);
        await supabaseAdmin.from("events").update({ lat, lng }).eq("id", e.id);
        results.push({ id: e.id, status: "geocoded", lat, lng, query: q });
      } else {
        results.push({ id: e.id, status: "no-match", query: q });
      }
    } catch {
      results.push({ id: e.id, status: "error" });
    }
    await sleep(1100); // Nominatim allows ~1 request/second
  }

  return NextResponse.json({ processed: events.length, results });
}