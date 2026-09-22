import { supabasePublic } from "@/lib/supabase/public";
import { getAllRegions } from "@/lib/marketplace/regions";
import { LISTING_COLUMNS, type Listing } from "@/lib/marketplace/listings";
import { SOCIETY_SLUG } from "@/lib/config";
import type { LocatableRegion } from "@/components/marketplace/NearMeButton";
import Hero from "@/components/sections/Hero";
import ToolGrid from "@/components/sections/ToolGrid";
import JustPosted from "@/components/sections/JustPosted";
import SocietyBanner from "@/components/sections/SocietyBanner";
import CTA from "@/components/sections/CTA";
import HotForums from "@/components/forum/HotForums";

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

  // Society roster and entry price for the banner. Both are cosmetic, so a
  // missing row just renders the banner without those two numbers.
  const { data: societyRow } = await supabasePublic
    .from("clubs")
    .select("id, dues_amount_cents")
    .eq("slug", SOCIETY_SLUG)
    .maybeSingle();

  let societyMembers = 0;
  if (societyRow) {
    const { count } = await supabasePublic
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", societyRow.id)
      .eq("status", "active");
    societyMembers = count ?? 0;
  }

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
      {/* The live stuff first: what's for sale and what people are talking about. */}
      <JustPosted listings={listings} regionNames={regionNames} />
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6">
        <HotForums />
      </section>
      <ToolGrid />
      <SocietyBanner
        memberCount={societyMembers}
        duesCents={societyRow?.dues_amount_cents ?? 0}
      />
      <CTA />
    </div>
  );
}
