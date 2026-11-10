import { NextResponse, type NextRequest } from "next/server";
import { getClaimedShopsNear } from "@/lib/stores/claimedNearby";

/**
 * Claimed shops near a point, for the "Local fish stores" box on classified
 * ads and forum threads. Uses ?lat=&lng= when given (an ad's region),
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
    const limit = Math.min(6, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 3));
    const shops = await getClaimedShopsNear(lat, lng, { limit });
    return NextResponse.json(
      { shops },
      // Location-based, so don't let a shared cache hand one city's shops to another.
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ shops: [] });
  }
}
