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
        <div className={`mb-3 items-center justify-between gap-4 sm:mb-6 ${viewer ? "hidden sm:flex" : "flex"}`}>
          <div>
            <h1 className="sr-only sm:not-sr-only font-display text-4xl text-white">Home</h1>
          </div>
          {!viewer && (
            <Link
              href="/login"
              className="rounded-xl bg-ocean-500 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-400"
            >
              Sign in to post
            </Link>
          )}
        </div>

        {viewer && (
          <div className="mb-3 flex gap-6 border-b border-ocean-800/60 px-1 sm:mb-5">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className={`-mb-px border-b-2 pb-2.5 pt-1 text-[15px] font-semibold transition-colors ${
                  scope === t.key ? "border-ocean-300 text-white" : "border-transparent text-ocean-500 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        )}

        <Feed
          key={scope}
          scope={scope}
          initialItems={items}
          viewer={viewer}
          showComposer
          composeFocus={compose === "1"}
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
