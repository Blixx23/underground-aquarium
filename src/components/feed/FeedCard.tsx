"use client";

import { useCallback, useRef, useState } from "react";
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
  MessagesSquare,
  Share2,
  Pencil,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";
import SocietySeal from "@/components/society/SocietySeal";
import ReportButton from "@/components/ReportButton";
import BlockButton from "@/components/BlockButton";
import Comments from "@/components/feed/Comments";
import LikersSheet from "@/components/feed/LikersSheet";
import PhotoViewer from "@/components/feed/PhotoViewer";
import { formatPrice } from "@/lib/marketplace/listings";
import { categoryLabel } from "@/lib/marketplace/categories";
import { canCommentInFeed, feedItemPath, timeAgo, type FeedItem } from "@/lib/feed";

const ACTIVITY: Record<
  Exclude<FeedItem["kind"], "post">,
  { icon: typeof Fish; verb: string; tone: string }
> = {
  tank: { icon: Fish, verb: "shared a tank", tone: "text-emerald-300" },
  listing: { icon: Tag, verb: "listed", tone: "text-sky-300" },
  spawn: { icon: Egg, verb: "had a spawn approved", tone: "text-emerald-300" },
  badge: { icon: Award, verb: "earned a trophy", tone: "text-sky-300" },
  thread: { icon: MessagesSquare, verb: "started a discussion", tone: "text-sky-300" },
};

/**
 * One item in the feed. Everything can be liked, shared and (except forum
 * discussions, which reply in the forum) commented on, the way people expect
 * from any social feed.
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
  const [focusBox, setFocusBox] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLikers, setShowLikers] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const [body, setBody] = useState(item.body);
  const [edited, setEdited] = useState(Boolean(item.meta?.edited));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.body ?? "");
  const [saving, setSaving] = useState(false);
  const liking = useRef(false);

  const profileHref = item.author_username ? `/u/${item.author_username}` : "#";
  const isPost = item.kind === "post";
  const isMine = viewerId === item.user_id;
  const commentable = canCommentInFeed(item.kind);
  const threadReplies = item.kind === "thread" ? Number(item.meta?.replies ?? 0) : 0;
  const closeLikers = useCallback(() => setShowLikers(false), []);
  const closeViewer = useCallback(() => setViewer(null), []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  function needLogin(): boolean {
    if (viewerId) return false;
    window.location.href = `/login?next=${encodeURIComponent(feedItemPath(item))}`;
    return true;
  }

  async function like(force?: boolean) {
    if (needLogin() || liking.current) return;
    // Double-tap only ever likes; it never un-likes.
    if (force && liked) return;
    liking.current = true;
    const was = liked;
    const wasCount = likes;
    // Optimistic: the heart responds instantly, the database has the final word.
    setLiked(!was);
    setLikes(Math.max(0, wasCount + (was ? -1 : 1)));
    const { data, error: err } = await supabase.rpc("toggle_feed_reaction", { p_kind: item.kind, p_id: item.id });
    const row = (Array.isArray(data) ? data[0] : data) as { liked: boolean; like_count: number } | null;
    if (err || !row) {
      setLiked(was);
      setLikes(wasCount);
      setError(err?.message ?? "Couldn't like that.");
    } else {
      setLiked(row.liked);
      setLikes(row.like_count);
      setError(null);
    }
    liking.current = false;
  }

  function doubleTapLike() {
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    like(true);
  }

  function openComments() {
    if (!commentable) return;
    setOpen(true);
    setFocusBox(true);
  }

  async function share() {
    const url = `${window.location.origin}${feedItemPath(item)}`;
    const title = isPost ? `Post by ${item.author_name}` : item.title ?? "Underground Aquarium";
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        // They closed the share sheet: nothing to do.
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch {
      setError("Couldn't copy the link.");
    }
  }

  async function copyLink() {
    setMenu(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${feedItemPath(item)}`);
      flash("Link copied");
    } catch {
      /* ignore */
    }
  }

  async function remove() {
    setMenu(false);
    if (!window.confirm("Delete this post?")) return;
    const { error: err } = await supabase.rpc("delete_feed_post", { p_id: item.id });
    if (err) setError(err.message);
    else if (onRemoved) onRemoved(item.id);
    else window.location.href = "/feed";
  }

  function startEdit() {
    setMenu(false);
    setDraft(body ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    const text = draft.trim();
    if (saving) return;
    if (text === (body ?? "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.rpc("edit_feed_post", { p_id: item.id, p_body: text });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setBody(text);
    setEdited(true);
    setEditing(false);
    setError(null);
  }

  const header = (
    <div className="flex items-center gap-3">
      <Link href={profileHref}>
        <Avatar name={item.author_name} src={item.author_avatar} society={item.author_society} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={profileHref} className="truncate text-[15px] font-semibold text-white hover:underline">
            {item.author_name}
          </Link>
          {item.author_society && (
            <span title="Underground Aquarium Society member" className="shrink-0">
              <SocietySeal size={16} className="h-4 w-4" />
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ocean-400">
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
          {isPost && edited && " · Edited"}
        </p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          className="rounded-lg p-1.5 text-ocean-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="More options"
          aria-expanded={menu}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {menu && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setMenu(false)}
            />
            <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-ocean-700/70 bg-[#06182b] p-1.5 shadow-2xl shadow-black/70">
              {isPost && isMine && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-ocean-100 hover:bg-white/5"
                >
                  <Pencil className="h-4 w-4" /> Edit post
                </button>
              )}
              <button
                type="button"
                onClick={copyLink}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-ocean-100 hover:bg-white/5"
              >
                <Link2 className="h-4 w-4" /> Copy link
              </button>
              {isPost && (isMine || viewerIsAdmin) && (
                <button
                  type="button"
                  onClick={remove}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-coral-300 hover:bg-white/5"
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </button>
              )}
              {!isMine && viewerId && (
                <div className="px-3 py-2">
                  <BlockButton
                    userId={item.user_id}
                    name={item.author_name.split(" ")[0]}
                    onBlocked={() => onRemoved?.(item.id)}
                  />
                </div>
              )}
              {isPost && !isMine && (
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
          </>
        )}
      </div>
    </div>
  );

  const commentLabel = comments === 1 ? "1 comment" : `${comments} comments`;
  const showCounts = likes > 0 || (commentable ? comments > 0 : threadReplies > 0);

  return (
    <article className="relative rounded-2xl border border-ocean-800/60 bg-ocean-900/40 font-sans">
      <div className="p-4 sm:p-5">
        {header}

        {isPost ? (
          editing ? (
            <div className="mt-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                rows={Math.min(10, Math.max(3, draft.split("\n").length + 1))}
                autoFocus
                className="w-full resize-y rounded-xl border border-ocean-700/70 bg-ocean-950/70 px-3.5 py-2.5 text-base leading-relaxed text-white focus:border-ocean-500 focus:outline-none sm:text-[15px]"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-3 py-2 text-sm text-ocean-300 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || (!draft.trim() && item.images.length === 0)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-500 disabled:opacity-40"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            body && (
              <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ocean-50">{body}</p>
            )
          )
        ) : (
          <ActivityBody item={item} />
        )}
      </div>

      {isPost && item.images.length > 0 && (
        <div className="relative">
          <Photos images={item.images} onOpen={setViewer} onDoubleTap={doubleTapLike} />
          {burst && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="h-24 w-24 animate-ping fill-coral-400 text-coral-400 drop-shadow-2xl" />
            </span>
          )}
        </div>
      )}

      {showCounts && (
        <div className="flex items-center justify-between gap-3 px-4 pt-2.5 text-[13px] text-ocean-300 sm:px-5">
          {likes > 0 ? (
            <button
              type="button"
              onClick={() => setShowLikers(true)}
              className="inline-flex items-center gap-1.5 hover:underline"
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-coral-500">
                <Heart className="h-2.5 w-2.5 fill-white text-white" />
              </span>
              {likes}
            </button>
          ) : (
            <span />
          )}
          {commentable && comments > 0 && (
            <button type="button" onClick={() => setOpen((o) => !o)} className="hover:underline">
              {commentLabel}
            </button>
          )}
          {!commentable && threadReplies > 0 && item.href && (
            <Link href={item.href} className="hover:underline">
              {threadReplies} {threadReplies === 1 ? "reply" : "replies"}
            </Link>
          )}
        </div>
      )}

      <div className="mx-3 mt-1.5 grid grid-cols-3 border-t border-ocean-800/50 py-1 sm:mx-4">
        <button
          type="button"
          onClick={() => like()}
          className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors hover:bg-white/5 ${
            liked ? "text-coral-400" : "text-ocean-300 hover:text-white"
          }`}
          aria-pressed={liked}
        >
          <Heart className={`h-[18px] w-[18px] transition-transform ${liked ? "scale-110 fill-current" : ""}`} />
          Like
        </button>
        {commentable ? (
          <button
            type="button"
            onClick={() => (open ? setOpen(false) : openComments())}
            className="inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-ocean-300 transition-colors hover:bg-white/5 hover:text-white"
            aria-expanded={open}
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            Comment
          </button>
        ) : (
          <Link
            href={item.href ?? "/forums"}
            className="inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-ocean-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <MessagesSquare className="h-[18px] w-[18px]" />
            Reply
          </Link>
        )}
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-ocean-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Share2 className="h-[18px] w-[18px]" />
          Share
        </button>
      </div>

      {error && <p className="px-5 pb-3 text-sm text-coral-300">{error}</p>}

      {open && commentable && (
        <Comments
          kind={item.kind}
          postId={item.id}
          postOwnerId={item.user_id}
          viewerId={viewerId}
          viewerIsAdmin={viewerIsAdmin}
          autoFocus={focusBox}
          onCountChange={setComments}
        />
      )}

      {toast && (
        <span className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-ocean-700 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          {toast}
        </span>
      )}

      {showLikers && <LikersSheet kind={item.kind} id={item.id} onClose={closeLikers} />}
      {viewer !== null && <PhotoViewer images={item.images} start={viewer} onClose={closeViewer} />}
    </article>
  );
}

/**
 * One photo full-width; two to four in a fixed-shape grid so nothing jumps as
 * they load. Tap opens the viewer, double-tap likes.
 */
function Photos({
  images,
  onOpen,
  onDoubleTap,
}: {
  images: string[];
  onOpen: (i: number) => void;
  onDoubleTap: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function tap(i: number) {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      onDoubleTap();
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onOpen(i);
    }, 260);
  }

  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;

  if (shown.length === 1) {
    return (
      <button type="button" onClick={() => tap(0)} className="block w-full bg-ocean-950" aria-label="Open photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shown[0]} alt="" loading="lazy" className="max-h-[560px] w-full object-cover" />
      </button>
    );
  }
  const shape = shown.length === 2 ? "aspect-[2/1] grid-cols-2" : "aspect-[4/3] grid-cols-2 grid-rows-2";
  return (
    <div className={`grid gap-0.5 bg-ocean-950 ${shape}`}>
      {shown.map((src, i) => (
        <button
          type="button"
          key={src}
          onClick={() => tap(i)}
          aria-label={`Open photo ${i + 1}`}
          className={`relative block min-h-0 overflow-hidden ${shown.length === 3 && i === 0 ? "row-span-2" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          {extra > 0 && i === shown.length - 1 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
              +{extra}
            </span>
          )}
        </button>
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
    sub = [m.points ? `${m.points} points` : null, m.first ? "First in the Society" : null]
      .filter(Boolean)
      .join(" · ");
  } else if (item.kind === "badge") {
    sub = (m.detail as string) || (m.description as string) || "";
  } else if (item.kind === "thread") {
    sub = [m.category, m.replies ? `${m.replies} repl${Number(m.replies) === 1 ? "y" : "ies"}` : null]
      .filter(Boolean)
      .join(" · ");
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
        {item.kind === "thread" && item.body && (
          <span className="mt-0.5 line-clamp-2 block text-sm text-ocean-300">{item.body}</span>
        )}
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
