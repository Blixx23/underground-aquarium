"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Waves } from "lucide-react";
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

/**
 * A feed that keeps loading as you scroll. The first page arrives from the
 * server with the page; after that it pages by time from the browser.
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
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setMore(initialItems.length >= FEED_PAGE);
    setFailed(false);
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
        const fresh = next.filter((i) => !seen.has(`${i.kind}:${i.id}`));
        added = fresh.length;
        return fresh.length ? [...cur, ...fresh] : cur;
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

  async function refresh() {
    const { items: fresh, error } = await fetchFeed(supabase, { scope, userId });
    if (error) return;
    setItems(fresh);
    setMore(fresh.length >= FEED_PAGE);
    setFailed(false);
  }

  function retry() {
    setFailed(false);
  }

  return (
    <div className="space-y-3 sm:space-y-4">
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
            onRemoved={(id) => setItems((cur) => cur.filter((i) => !(i.kind === "post" && i.id === id)))}
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
