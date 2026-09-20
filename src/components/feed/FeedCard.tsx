"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Fish,
  Tag,
  Egg,
  Award,
  MoreHorizontal,
  Trash2,
  Link2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";
import SocietySeal from "@/components/society/SocietySeal";
import ReportButton from "@/components/ReportButton";
import Comments from "@/components/feed/Comments";
import { formatPrice } from "@/lib/marketplace/listings";
import { categoryLabel } from "@/lib/marketplace/categories";
import { timeAgo, type FeedItem } from "@/lib/feed";

const ACTIVITY: Record<
  Exclude<FeedItem["kind"], "post">,
  { icon: typeof Fish; verb: string; tone: string }
> = {
  tank: { icon: Fish, verb: "shared a tank", tone: "text-emerald-300" },
  listing: { icon: Tag, verb: "listed", tone: "text-sky-300" },
  spawn: { icon: Egg, verb: "had a spawn approved", tone: "text-amber-300" },
  badge: { icon: Award, verb: "earned a badge", tone: "text-amber-300" },
};

/**
 * One item in the feed. Posts get the full treatment (photos, likes,
 * comments); activity is a compact card that links to the real thing.
 */
export default function FeedCard({
  item,
  viewerId,
  viewerIsAdmin = false,
  startOpen = false,
  onRemoved,
}: {
  item: FeedItem;
  viewerId: string | null;
  viewerIsAdmin?: boolean;
  startOpen?: boolean;
  onRemoved?: (id: string) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [liked, setLiked] = useState(item.liked);
  const [likes, setLikes] = useState(item.like_count);
  const [comments, setComments] = useState(item.comment_count);
  const [open, setOpen] = useState(startOpen);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileHref = item.author_username ? `/u/${item.author_username}` : "#";
  const isPost = item.kind === "post";
  const isMine = viewerId === item.user_id;

  async function like() {
    if (!viewerId) {
      window.location.href = "/login";
      return;
    }
    // Optimistic: the heart responds instantly, the database has the final word.
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    const { data, error: err } = await supabase.rpc("toggle_feed_like", { p_post: item.id });
    const row = Array.isArray(data) ? data[0] : data;
    if (err || !row) {
      setLiked(liked);
      setLikes(item.like_count);
      setError(err?.message ?? "Couldn't like that.");
      return;
    }
    setLiked(row.liked);
    setLikes(row.like_count);
  }

  async function remove() {
    setMenu(false);
    if (!window.confirm("Delete this post?")) return;
    const { error: err } = await supabase.rpc("delete_feed_post", { p_id: item.id });
    if (err) setError(err.message);
    else if (onRemoved) onRemoved(item.id);
    else window.location.href = "/feed";
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feed/${item.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
    setMenu(false);
  }

  const header = (
    <div className="flex items-center gap-3">
      <Link href={profileHref}>
        <Avatar name={item.author_name} src={item.author_avatar} society={item.author_society} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={profileHref}
            className={`truncate text-[15px] font-semibold hover:underline ${
              item.author_society ? "text-amber-100" : "text-white"
            }`}
          >
            {item.author_name}
          </Link>
          {item.author_society && (
            <span title="Underground Aquarium Society member" className="shrink-0">
              <SocietySeal size={16} className="h-4 w-4" />
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ocean-500">
          {!isPost && (
            <span className={ACTIVITY[item.kind as Exclude<FeedItem["kind"], "post">].tone}>
              {ACTIVITY[item.kind as Exclude<FeedItem["kind"], "post">].verb}
              {" · "}
            </span>
          )}
          {item.author_username && `@${item.author_username} · `}
          {isPost ? (
            <Link href={`/feed/${item.id}`} className="hover:underline">
              {timeAgo(item.created_at)}
            </Link>
          ) : (
            timeAgo(item.created_at)
          )}
        </p>
      </div>

      {isPost && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            className="rounded-lg p-1.5 text-ocean-500 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Post options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-20 w-52 rounded-xl border border-ocean-800/70 bg-ocean-950 p-1.5 shadow-2xl shadow-black/60">
              <button
                type="button"
                onClick={copyLink}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ocean-200 hover:bg-white/5"
              >
                <Link2 className="h-4 w-4" /> Copy link
              </button>
              {(isMine || viewerIsAdmin) && (
                <button
                  type="button"
                  onClick={remove}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-coral-300 hover:bg-white/5"
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </button>
              )}
              {!isMine && (
                <div className="px-3 py-2">
                  <ReportButton
                    targetType="feed_post"
                    targetId={item.id}
                    targetLabel={`Post by ${item.author_name}`}
                    targetUrl={`/feed/${item.id}`}
                  />
                </div>
              )}
            </div>
          )}
          {copied && (
            <span className="absolute right-0 top-9 rounded-lg bg-ocean-800 px-2 py-1 text-xs text-white">
              Copied
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <article
      className={`rounded-2xl border ${
        item.author_society
          ? "border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-ocean-900/40"
          : "border-ocean-800/60 bg-ocean-900/40"
      }`}
    >
      <div className="p-4 sm:p-5">
        {header}

        {isPost ? (
          <>
            {item.body && (
              <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ocean-100">
                {item.body}
              </p>
            )}
          </>
        ) : (
          <ActivityBody item={item} />
        )}
      </div>

      {isPost && item.images.length > 0 && <Photos images={item.images} />}

      {isPost && (
        <>
          <div className="flex items-center gap-1 px-2 py-1.5 sm:px-3">
            <button
              type="button"
              onClick={like}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5 ${
                liked ? "text-coral-400" : "text-ocean-400 hover:text-white"
              }`}
              aria-pressed={liked}
            >
              <Heart className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
              {likes > 0 && likes}
            </button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ocean-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
              {comments > 0 ? comments : "Comment"}
            </button>
          </div>
          {error && <p className="px-5 pb-3 text-sm text-coral-300">{error}</p>}
          {open && (
            <Comments
              postId={item.id}
              postOwnerId={item.user_id}
              viewerId={viewerId}
              onCountChange={setComments}
            />
          )}
        </>
      )}
    </article>
  );
}

/** One photo full-width; two to four in a fixed-shape grid so nothing jumps as they load. */
function Photos({ images }: { images: string[] }) {
  if (images.length === 1) {
    return (
      <a href={images[0]} target="_blank" rel="noopener noreferrer" className="block bg-ocean-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" loading="lazy" className="max-h-[560px] w-full object-cover" />
      </a>
    );
  }
  const shape =
    images.length === 2 ? "aspect-[2/1] grid-cols-2" : "aspect-[4/3] grid-cols-2 grid-rows-2";
  return (
    <div className={`grid gap-0.5 bg-ocean-950 ${shape}`}>
      {images.map((src, i) => (
        <a
          key={src}
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className={`block min-h-0 overflow-hidden ${images.length === 3 && i === 0 ? "row-span-2" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}

/** The compact card for automatic activity. */
function ActivityBody({ item }: { item: FeedItem }) {
  const a = ACTIVITY[item.kind as Exclude<FeedItem["kind"], "post">];
  const Icon = a.icon;
  const cover = item.images[0];
  const m = item.meta as Record<string, string | number | boolean | null>;

  let sub = "";
  if (item.kind === "tank") {
    sub = [m.gallons ? `${m.gallons} gal` : null, m.species ? `${m.species} species` : null]
      .filter(Boolean)
      .join(" · ");
  } else if (item.kind === "listing") {
    const price = m.is_wanted ? "Wanted" : m.is_free ? "Free" : formatPrice(m.price_cents as number | null);
    sub = [price, m.category ? categoryLabel(String(m.category)) : null, m.city].filter(Boolean).join(" · ");
  } else if (item.kind === "spawn") {
    sub = [
      m.points ? `${m.points} points` : null,
      m.first ? "First in the Society" : null,
    ]
      .filter(Boolean)
      .join(" · ");
  } else if (item.kind === "badge") {
    sub = (m.detail as string) || "Underground Aquarium Society";
  }

  const inner = (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-colors group-hover:border-white/15">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ocean-950">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Icon className={`h-6 w-6 ${a.tone}`} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium text-white">{item.title}</span>
        {sub && <span className="block truncate text-sm text-ocean-400">{sub}</span>}
      </span>
    </div>
  );

  return item.href ? (
    <Link href={item.href} className="group block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
