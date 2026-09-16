import { supabasePublic } from "@/lib/supabase/public";
import { getAllRegions } from "@/lib/marketplace/regions";
import { LISTING_COLUMNS, type Listing } from "@/lib/marketplace/listings";
import type { LocatableRegion } from "@/components/marketplace/NearMeButton";
import Hero from "@/components/sections/Hero";
import ToolGrid from "@/components/sections/ToolGrid";
import JustPosted from "@/components/sections/JustPosted";
import CTA from "@/components/sections/CTA";

// The homepage shows live listings, so it can't be fully static, but it
// doesn't need to be fresh to the second either.
export const revalidate = 120;

export default async function HomePage() {
  const [regions, { data: listingData }, { count: liveCount }] =
    await Promise.all([
      getAllRegions(),
      supabasePublic
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("bumped_at", { ascending: false })
        .limit(10),
      supabasePublic
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString()),
    ]);

  const listings = (listingData ?? []) as unknown as Listing[];

  const locatable: LocatableRegion[] = regions
    .filter((r) => r.lat !== null && r.lng !== null)
    .map((r) => ({
      state_code: r.state_code,
      slug: r.slug,
      name: r.name,
      state_name: r.state_name,
      lat: r.lat as number,
      lng: r.lng as number,
    }));

  const regionNames = new Map(
    regions.map((r) => [`${r.state_code}/${r.slug}`, r.name])
  );

  return (
    <div className="overflow-x-clip">
      <Hero locatable={locatable} liveListings={liveCount ?? 0} />
      <ToolGrid />
      <JustPosted listings={listings} regionNames={regionNames} />
      <CTA />
    </div>
  );
}
