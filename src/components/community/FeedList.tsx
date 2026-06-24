"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  ArrowBigUp,
  Fish,
  MessagesSquare,
  Loader2,
} from "lucide-react";
import type { FeedItem } from "@/lib/communityFeed";

function FeedCard({ item }: { item: FeedItem }) {
  const isTank = item.feed_type === "tank";
  const TypeIcon = isTank ? Fish : MessagesSquare;
  const typeLabel = isTank ? "Tank" : "Discussion";
  const LikeIcon = isTank ? Heart : ArrowBigUp;

  return (
    <Link
      href={item.href}
      className="block rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-emerald-500/40 transition-colors"
    >
      {item.image_url && (
        <div className="aspect-[4/3] bg-ocean-950/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-ocean-500 mb-1.5">
          <TypeIcon className="w-3.5 h-3.5 text-emerald-400/80" />
          <span>{typeLabel}</span>
          {item.meta && (
            <>
              <span>·</span>
              <span className="truncate">{item.meta}</span>
            </>
          )}
        </div>

        <h3 className="text-white font-medium leading-snug">{item.title}</h3>

        {!item.image_url && item.excerpt && (
          <p className="text-sm text-ocean-400 mt-1 line-clamp-3">
            {item.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 text-xs text-ocean-500">
          <span className="truncate">by {item.authorName}</span>
          <span className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1">
              <LikeIcon className="w-3.5 h-3.5" />
              {item.like_count}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {item.comment_count}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function FeedList({
  initialItems,
  initialHasMore,
}: {
  initialItems: FeedItem[];
  initialHasMore: boolean;
}) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/community/feed?offset=${items.length}&limit=20`
      );
      const data = await res.json();
      const next = (data.items ?? []) as FeedItem[];
      setItems((prev) => [...prev, ...next]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      // leave as-is; user can scroll again to retry
    } finally {
      setLoading(false);
    }
  }, [items.length, loading, hasMore]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <FeedCard key={`${it.feed_type}-${it.id}`} item={it} />
        ))}
      </div>

      {hasMore && (
        <div
          ref={sentinel}
          className="h-12 flex items-center justify-center mt-6 text-ocean-500"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        </div>
      )}
    </>
  );
}
