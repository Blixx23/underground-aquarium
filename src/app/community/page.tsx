import type { Metadata } from "next";
import Link from "next/link";
import { Fish } from "lucide-react";
import { getFeedPage } from "@/lib/communityFeed";
import FeedList from "@/components/community/FeedList";

// Public feed, no per-user data — cache the first page briefly so traffic
// doesn't hit the DB on every visit. Load-more requests stay live via the API.
export const revalidate = 30;

export const metadata: Metadata = {
  title: "Community",
  description:
    "The Underground Aquarium community feed — tanks and discussions shared by fellow hobbyists.",
};

export default async function CommunityPage() {
  const { items, hasMore } = await getFeedPage(0, 20);

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-8">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Community
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Community feed
          </h1>
          <p className="text-ocean-300">
            Tanks and discussions from fellow hobbyists, newest first. Share a
            build or start a thread to show up here.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <Fish className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Nothing here yet</p>
            <p className="text-ocean-400 text-sm mb-4">
              Be the first to share a build or start a discussion.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/tank-builder"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                Plan a tank →
              </Link>
              <Link
                href="/forums"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                Visit the forums →
              </Link>
            </div>
          </div>
        ) : (
          <FeedList initialItems={items} initialHasMore={hasMore} />
        )}
      </div>
    </main>
  );
}
