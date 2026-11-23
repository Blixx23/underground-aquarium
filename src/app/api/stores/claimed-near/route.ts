import { NextResponse, type NextRequest } from "next/server";
import { getShopsNear } from "@/lib/stores/claimedNearby";

/**
 * Fish stores near a point (claimed or not), for the local shop card on
 * classified ads, forum lists and the tools. Uses ?lat=&lng= when given (an ad's region),
 * otherwise the visitor's rough location from Vercel's connection headers.
 */
export async function GET(req: NextRequest) {
  const qLat = Number(req.nextUrl.searchParams.get("lat"));
  const qLng = Number(req.nextUrl.searchParams.get("lng"));
  let lat: number | null = null;
  let lng: number | null = null;

  if (req.nextUrl.searchParams.has("lat") && Number.isFinite(qLat) && Number.isFinite(qLng)) {
    lat = qLat;
    lng = qLng;
  } else {
    const hLat = req.headers.get("x-vercel-ip-latitude");
    const hLng = req.headers.get("x-vercel-ip-longitude");
    const a = Number(hLat);
    const b = Number(hLng);
    if (hLat && hLng && Number.isFinite(a) && Number.isFinite(b) && (a !== 0 || b !== 0)) {
      lat = a;
      lng = b;
    }
  }

  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ shops: [] });
  }

  try {
    const limit = Math.min(12, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 3));
    const nearest = await getShopsNear(lat, lng, { limit });
    // Rotate among shops that are actually local (within 40 miles). Where
    // there are fewer than 3 that close, fall back to the nearest 3, so the
    // card still says something true ("Nearest fish store · 85 mi").
    const local = nearest.filter((s) => s.miles <= 40);
    const shops = local.length >= 3 ? local : nearest.slice(0, 3);
    return NextResponse.json(
      { shops },
      // Location-based, so don't let a shared cache hand one city's shops to another.
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ shops: [] });
  }
}
