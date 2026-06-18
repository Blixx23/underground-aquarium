import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClubsDiscover from "./ClubsDiscover";

export const metadata = {
  title: "Discover clubs — Underground Aquarium",
};

export default async function DiscoverClubsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_club_directory")
    .select(
      "id, slug, name, logo_url, city, state, dues_amount_cents, lat, lng, member_count"
    )
    .order("member_count", { ascending: false });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
          <h1 className="font-display text-3xl text-white">Discover clubs</h1>
          <Link
            href="/clubs/new"
            className="text-sm text-ocean-300 hover:text-white transition-colors"
          >
            Start a club →
          </Link>
        </div>
        <p className="text-ocean-400 mb-6">
          Find an aquarium club to join — search by area, or use your location
          to sort by what&apos;s nearest.
        </p>
        <ClubsDiscover clubs={data ?? []} />
      </div>
    </main>
  );
}
