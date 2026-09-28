import { NextResponse } from "next/server";
import { siteSearch } from "@/lib/search/site";

/**
 * Site-wide search: GET /api/search?q=cherry+shrimp
 * Public data only. Identical queries are cached at the edge for a minute,
 * so a burst of people typing the same thing costs one database round trip.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const n = Number(searchParams.get("n")) || 5;

  if (q.length < 2) return NextResponse.json({ q, groups: [], correctedTo: null });

  try {
    const { groups, correctedTo } = await siteSearch(q, n);
    return NextResponse.json(
      { q, groups, correctedTo },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("Site search error:", err);
    return NextResponse.json({ q, groups: [], correctedTo: null });
  }
}
