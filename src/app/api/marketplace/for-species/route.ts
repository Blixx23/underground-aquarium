import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { adsForSpecies } from "@/lib/marketplace/speciesAds";

export const dynamic = "force-dynamic";

/**
 * Live classified ads for one species, for its page's "For sale near you".
 * ?slug=neon-tetra, plus ?region=<id> to get that area's center for sorting
 * by distance. The member's exact location never comes here; the page sorts
 * in the browser.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.json({ ads: [] }, { status: 400 });
  const regionId = url.searchParams.get("region");

  const [ads, center] = await Promise.all([
    adsForSpecies({ slug }).catch(() => []),
    regionId && /^[0-9a-f-]{8,40}$/i.test(regionId)
      ? supabasePublic
          .from("market_regions")
          .select("name, state_code, lat, lng")
          .eq("id", regionId)
          .maybeSingle()
          .then(({ data }) => data)
      : Promise.resolve(null),
  ]);

  return NextResponse.json(
    { ads, center },
    // Fresh enough for ads, light on the database.
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
