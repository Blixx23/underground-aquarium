import type { Metadata } from "next";
import Link from "next/link";
import Feed from "@/components/feed/Feed";
import { fetchFeed, type FeedScope } from "@/lib/feed";
import { getViewer } from "@/lib/feedViewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feed",
  description: "What the Underground Aquarium community is breeding, building and selling right now.",
};

/**
 * The home feed. Signed-in people land on who they follow; "Everyone"
 * is the whole site. Signed-out visitors just see Everyone.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; compose?: string }>;
}) {
  const { tab, compose } = await searchParams;
  const { viewer, supabase } = await getViewer();
  const scope: FeedScope = viewer && tab !== "everyone" ? "following" : "everyone";
  const { items } = await fetchFeed(supabase, { scope });

  const tabs: { key: FeedScope; label: string; href: string }[] = [
    { key: "following", label: "Following", href: "/feed" },
    { key: "everyone", label: "Everyone", href: "/feed?tab=everyone" },
  ];

  return (
    <main className="min-h-screen px-3 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-2xl">
        {!viewer && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-ocean-700/50 bg-ocean-900/50 p-4">
            <p className="text-sm text-ocean-300">Sign in to post, like and comment.</p>
            <Link
              href="/login?next=/feed"
              className="shrink-0 rounded-xl bg-ocean-500 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-400"
            >
              Sign in
            </Link>
          </div>
        )}

        <Feed
          key={scope}
          scope={scope}
          initialItems={items}
          viewer={viewer}
          showComposer
          composeFocus={compose === "1"}
          between={
            <div className="flex items-center justify-between gap-3 pt-5 pb-1 sm:pt-7">
              <h1 className="font-display text-2xl text-white sm:text-3xl">Feed</h1>
              {viewer && (
                <div className="flex gap-1 rounded-full border border-ocean-800/70 bg-ocean-950/60 p-1">
                  {tabs.map((t) => (
                    <Link
                      key={t.key}
                      href={t.href}
                      scroll={false}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        scope === t.key ? "bg-ocean-600 text-white" : "text-ocean-400 hover:text-white"
                      }`}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          }
          emptyText={
            scope === "following"
              ? "Follow people to fill this up, or check out Everyone."
              : "Nothing here yet. Be the first to post."
          }
        />
      </div>
    </main>
  );
}
