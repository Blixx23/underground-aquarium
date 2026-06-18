import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GEOCODE_SECRET = process.env.GEOCODE_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

type ClubRow = {
  id: string;
  city: string | null;
  state: string | null;
};

function buildQuery(c: ClubRow): string | null {
  const parts = [c.city, c.state].filter(
    (p): p is string => !!p && p.trim().length > 0
  );
  if (parts.length === 0) return null;
  return parts.join(", ") + ", USA";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authed =
    (!!CRON_SECRET &&
      request.headers.get("authorization") === `Bearer ${CRON_SECRET}`) ||
    (!!GEOCODE_SECRET && url.searchParams.get("key") === GEOCODE_SECRET);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Public clubs without coordinates yet (max 8 per run to be polite).
  const { data, error } = await supabaseAdmin
    .from("clubs")
    .select("id, city, state")
    .is("lat", null)
    .eq("is_public", true)
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const clubs = (data ?? []) as ClubRow[];
  const results: {
    id: string;
    status: string;
    lat?: number;
    lng?: number;
    query?: string;
  }[] = [];

  for (const c of clubs) {
    const q = buildQuery(c);
    if (!q) {
      results.push({ id: c.id, status: "skipped-no-location" });
      continue;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          q
        )}`,
        {
          headers: {
            "User-Agent": "UndergroundAquarium/1.0 (clubs geocoder)",
          },
        }
      );
      const json = (await res.json()) as { lat: string; lon: string }[];
      if (json.length > 0) {
        const lat = parseFloat(json[0].lat);
        const lng = parseFloat(json[0].lon);
        await supabaseAdmin.from("clubs").update({ lat, lng }).eq("id", c.id);
        results.push({ id: c.id, status: "geocoded", lat, lng, query: q });
      } else {
        results.push({ id: c.id, status: "no-match", query: q });
      }
    } catch {
      results.push({ id: c.id, status: "error" });
    }
    await sleep(1100); // Nominatim allows ~1 request/second
  }

  return NextResponse.json({ processed: clubs.length, results });
}
