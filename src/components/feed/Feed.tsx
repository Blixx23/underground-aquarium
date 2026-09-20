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
}: {
  scope: FeedScope;
  userId?: string | null;
  initialItems: FeedItem[];
  viewer: Viewer;
  showComposer?: boolean;
  composeFocus?: boolean;
  emptyText?: string;
}) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState(initialItems);
  const [more, setMore] = useState(initialItems.length >= FEED_PAGE);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setMore(initialItems.length >= FEED_PAGE);
  }, [initialItems]);

  const loadMore = useCallback(async () => {
    if (loading || !more || items.length === 0) return;
    setLoading(true);
    const { items: next } = await fetchFeed(supabase, {
      scope,
      userId,
      before: items[items.length - 1].created_at,
    });
    setItems((cur) => {
      const seen = new Set(cur.map((i) => `${i.kind}:${i.id}`));
      return [...cur, ...next.filter((i) => !seen.has(`${i.kind}:${i.id}`))];
    });
    setMore(next.length >= FEED_PAGE);
    setLoading(false);
  }, [loading, more, items, supabase, scope, userId]);

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
    const { items: fresh } = await fetchFeed(supabase, { scope, userId });
    setItems(fresh);
    setMore(fresh.length >= FEED_PAGE);
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
      {!more && items.length > 0 && (
        <p className="py-6 text-center text-xs text-ocean-600">You&apos;re all caught up.</p>
      )}
    </div>
  );
}
