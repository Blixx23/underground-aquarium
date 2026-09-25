"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Waves } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import FeedCard from "@/components/feed/FeedCard";
import Composer from "@/components/feed/Composer";
import { fetchFeed, FEED_PAGE, type FeedItem, type FeedScope } from "@/lib/feed";

export type Viewer = {
  id: string;
  name: string;
  avatar: string | null;
  society: boolean;
  isAdmin: boolean;
} | null;

/** How often to check quietly for new posts while the page is open. */
const POLL_MS = 60_000;

/**
 * A feed that keeps loading as you scroll. The first page arrives from the
 * server with the page; after that it pages by time from the browser. While
 * it's open it checks for new posts and offers a "New posts" button rather
 * than shoving the page around under the reader.
 */
export default function Feed({
  scope,
  userId = null,
  initialItems,
  viewer,
  showComposer = false,
  composeFocus = false,
  emptyText = "Nothing here yet.",
  between,
}: {
  scope: FeedScope;
  userId?: string | null;
  initialItems: FeedItem[];
  viewer: Viewer;
  showComposer?: boolean;
  composeFocus?: boolean;
  emptyText?: string;
  /** Shown between the post box and the posts (the feed's heading and tabs). */
  between?: React.ReactNode;
}) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState(initialItems);
  const [more, setMore] = useState(initialItems.length >= FEED_PAGE);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fresh, setFresh] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const newest = useRef<string | null>(initialItems[0]?.created_at ?? null);

  useEffect(() => {
    setItems(initialItems);
    setMore(initialItems.length >= FEED_PAGE);
    setFailed(false);
    setFresh(0);
    newest.current = initialItems[0]?.created_at ?? null;
  }, [initialItems]);

  const loadMore = useCallback(async () => {
    if (loading || !more || failed || items.length === 0) return;
    setLoading(true);
    try {
      const { items: next, error } = await fetchFeed(supabase, {
        scope,
        userId,
        before: items[items.length - 1].created_at,
      });
      // A failed request is not the end of the feed. Say so, and offer a retry,
      // rather than claiming they're caught up when they aren't.
      if (error) {
        setFailed(true);
        return;
      }
      let added = 0;
      setItems((cur) => {
        const seen = new Set(cur.map((i) => `${i.kind}:${i.id}`));
        const add = next.filter((i) => !seen.has(`${i.kind}:${i.id}`));
        added = add.length;
        return add.length ? [...cur, ...add] : cur;
      });
      // If a whole page came back as things we already had, the cursor can't
      // move, so asking again would fetch the same page forever.
      setMore(next.length >= FEED_PAGE && added > 0);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, more, failed, items, supabase, scope, userId]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), {
      rootMargin: "600px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // Quietly look for anything newer than the top of the list. Only while the
  // tab is visible, so a forgotten tab doesn't keep asking.
  useEffect(() => {
    let alive = true;
    async function check() {
      if (document.visibilityState !== "visible") return;
      const { items: latest, error } = await fetchFeed(supabase, { scope, userId, limit: 10 });
      if (!alive || error) return;
      const since = newest.current;
      const count = latest.filter(
        (i) => (!since || i.created_at > since) && i.user_id !== viewer?.id
      ).length;
      setFresh(count);
    }
    const t = setInterval(check, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [supabase, scope, userId, viewer?.id]);

  async function refresh() {
    const { items: latest, error } = await fetchFeed(supabase, { scope, userId });
    if (error) return;
    setItems(latest);
    setMore(latest.length >= FEED_PAGE);
    setFailed(false);
    setFresh(0);
    newest.current = latest[0]?.created_at ?? null;
  }

  async function showNew() {
    await refresh();
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function retry() {
    setFailed(false);
  }

  return (
    <div ref={top} className="space-y-3 scroll-mt-20 sm:space-y-4">
      {fresh > 0 && (
        <div className="pointer-events-none sticky top-20 z-30 flex justify-center">
          <button
            type="button"
            onClick={showNew}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-ocean-500 px-4 py-2 font-sans text-sm font-semibold text-white shadow-lg shadow-black/50 transition-colors hover:bg-ocean-400"
          >
            <ArrowUp className="h-4 w-4" />
            {fresh === 1 ? "1 new post" : `${fresh}${fresh >= 10 ? "+" : ""} new posts`}
          </button>
        </div>
      )}

      {showComposer && viewer && (
        <Composer
          userId={viewer.id}
          name={viewer.name}
          avatar={viewer.avatar}
          society={viewer.society}
          onPosted={refresh}
          autoFocus={composeFocus}
        />
      )}
      {between}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 px-6 py-14 text-center">
          <Waves className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
          <p className="text-sm text-ocean-400">{emptyText}</p>
        </div>
      ) : (
        items.map((item) => (
          <FeedCard
            key={`${item.kind}:${item.id}`}
            item={item}
            viewerId={viewer?.id ?? null}
            viewerIsAdmin={viewer?.isAdmin ?? false}
            onRemoved={(id) => {
              // A deleted post goes; blocking someone hides everything of theirs.
              const gone = items.find((i) => i.id === id);
              const deleted =
                !gone || (gone.kind === "post" && (gone.user_id === viewer?.id || viewer?.isAdmin));
              setItems((cur) =>
                cur.filter((i) =>
                  deleted ? !(i.kind === "post" && i.id === id) : i.user_id !== gone?.user_id
                )
              );
            }}
          />
        ))
      )}

      <div ref={sentinel} />
      {loading && (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-ocean-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading more…
        </p>
      )}
      {failed && (
        <div className="py-6 text-center">
          <p className="text-sm text-ocean-400">Couldn&apos;t load more posts.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
          >
            Try again
          </button>
        </div>
      )}
      {!more && !failed && items.length > 0 && (
        <p className="py-6 text-center text-xs text-ocean-600">You&apos;re all caught up.</p>
      )}
    </div>
  );
}
