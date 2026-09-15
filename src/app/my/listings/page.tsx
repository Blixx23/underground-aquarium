import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import MyListingsManager, {
  type ManagedListing,
} from "@/components/marketplace/MyListingsManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Listings",
  robots: { index: false, follow: false },
};

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="font-display text-2xl text-white mb-4">
            Sign in to see your listings
          </h1>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const { data: listingData } = await supabase
    .from("listings")
    .select(
      "id, slug, title, category, price_cents, is_wanted, images, status, views, city, state_code, region_slug, bumped_at, expires_at, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (listingData ?? []) as unknown as {
    id: string;
    slug: string;
    title: string;
    category: string;
    price_cents: number | null;
    is_wanted: boolean;
    images: string[] | null;
    status: string;
    views: number;
    city: string | null;
    state_code: string;
    region_slug: string;
    bumped_at: string;
    expires_at: string;
  }[];

  // Pretty region names, and how many conversations still need a reply.
  const [{ data: regionData }, { data: threadData }] = await Promise.all([
    supabasePublic.from("market_regions").select("state_code, slug, name"),
    supabase
      .from("listing_threads")
      .select("listing_id, last_message_at, seller_last_read_at, seller_id")
      .eq("seller_id", user.id),
  ]);

  const regionNames = new Map(
    ((regionData ?? []) as unknown as {
      state_code: string;
      slug: string;
      name: string;
    }[]).map((r) => [`${r.state_code}/${r.slug}`, r.name])
  );

  const unreadByListing = new Map<string, number>();
  for (const t of (threadData ?? []) as unknown as {
    listing_id: string;
    last_message_at: string;
    seller_last_read_at: string | null;
  }[]) {
    const unread =
      !t.seller_last_read_at ||
      new Date(t.last_message_at).getTime() >
        new Date(t.seller_last_read_at).getTime();
    if (unread) {
      unreadByListing.set(
        t.listing_id,
        (unreadByListing.get(t.listing_id) ?? 0) + 1
      );
    }
  }

  const listings: ManagedListing[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    price_cents: r.price_cents,
    is_wanted: r.is_wanted,
    images: r.images,
    status: r.status,
    views: r.views,
    city: r.city,
    region_name: regionNames.get(`${r.state_code}/${r.region_slug}`) ?? null,
    state_code: r.state_code,
    bumped_at: r.bumped_at,
    expires_at: r.expires_at,
    unread: unreadByListing.get(r.id) ?? 0,
  }));

  const draftCount = listings.filter((l) => l.status === "draft").length;

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl text-white mb-2">
              My listings
            </h1>
            <p className="text-ocean-400">
              {listings.length} total
              {draftCount > 0 && ` · ${draftCount} waiting to be published`}
            </p>
          </div>
          <Link
            href="/post"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post free ad
          </Link>
        </div>

        {draftCount > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 mb-6">
            <p className="text-sm text-amber-200">
              {draftCount} {draftCount === 1 ? "listing" : "listings"} came
              across from your old paid marketplace. Check the area on each one
              with <strong>Edit</strong>, then hit <strong>Publish</strong>.
            </p>
          </div>
        )}

        <MyListingsManager listings={listings} />
      </div>
    </main>
  );
}
