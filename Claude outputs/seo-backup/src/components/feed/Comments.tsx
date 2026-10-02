"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, Send, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";
import SocietySeal from "@/components/society/SocietySeal";
import { timeAgo, type FeedComment, type FeedKind } from "@/lib/feed";

const REPLIES_SHOWN = 2;

/**
 * Comments on anything in the feed, the way people expect them: like a
 * comment, reply to it (one level deep, like Facebook), delete your own
 * or any on your own post. Loaded when the card opens.
 */
export default function Comments({
  kind = "post",
  postId,
  postOwnerId,
  viewerId,
  viewerIsAdmin = false,
  autoFocus = false,
  onCountChange,
}: {
  kind?: FeedKind;
  /** The feed item's id (a post id, tank id, listing id...). */
  postId: string;
  postOwnerId: string;
  viewerId: string | null;
  viewerIsAdmin?: boolean;
  autoFocus?: boolean;
  onCountChange: (n: number) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<FeedComment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const { data, error: err } = await supabase.rpc("get_item_comments", { p_kind: kind, p_id: postId });
    if (err) setError("Couldn't load comments.");
    const list = ((data as FeedComment[] | null) ?? []).map((c) => ({
      ...c,
      like_count: c.like_count ?? 0,
      liked: Boolean(c.liked),
    }));
    setRows(list);
    onCountChange(list.length);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, postId]);

  useEffect(() => {
    if (autoFocus && viewerId) box.current?.focus();
  }, [autoFocus, viewerId]);

  // Top-level comments with their replies underneath. A reply whose parent was
  // deleted is shown as a top-level comment so it isn't lost.
  const threads = useMemo(() => {
    const list = rows ?? [];
    const ids = new Set(list.map((c) => c.id));
    const tops = list.filter((c) => !c.parent_id || !ids.has(c.parent_id));
    const replies = new Map<string, FeedComment[]>();
    for (const c of list) {
      if (c.parent_id && ids.has(c.parent_id)) {
        const arr = replies.get(c.parent_id) ?? [];
        arr.push(c);
        replies.set(c.parent_id, arr);
      }
    }
    return tops.map((c) => ({ c, replies: replies.get(c.id) ?? [] }));
  }, [rows]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("add_item_comment", {
      p_kind: kind,
      p_id: postId,
      p_body: text,
      p_parent: replyTo?.id ?? null,
    });
    if (err) setError(err.message);
    else {
      if (replyTo) setExpanded((s) => new Set(s).add(replyTo.parent_id ?? replyTo.id));
      setBody("");
      setReplyTo(null);
      await load();
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this comment?")) return;
    const { error: err } = await supabase.rpc("delete_item_comment", { p_comment: id });
    if (err) setError(err.message);
    else await load();
  }

  async function likeComment(c: FeedComment) {
    if (!viewerId) {
      window.location.href = "/login?next=/feed";
      return;
    }
    const flip = (liked: boolean, count: number) =>
      setRows((cur) => cur?.map((x) => (x.id === c.id ? { ...x, liked, like_count: count } : x)) ?? cur);
    flip(!c.liked, Math.max(0, c.like_count + (c.liked ? -1 : 1)));
    const { data, error: err } = await supabase.rpc("toggle_comment_like", { p_comment: c.id });
    const row = (Array.isArray(data) ? data[0] : data) as { liked: boolean; like_count: number } | null;
    if (err || !row) {
      flip(c.liked, c.like_count);
      setError(err?.message ?? "Couldn't like that.");
      return;
    }
    flip(row.liked, row.like_count);
  }

  function startReply(c: FeedComment) {
    if (!viewerId) {
      window.location.href = "/login?next=/feed";
      return;
    }
    setReplyTo(c);
    if (c.author_username && !body.trim()) setBody(`@${c.author_username} `);
    requestAnimationFrame(() => box.current?.focus());
  }

  function CommentRow({ c, small = false }: { c: FeedComment; small?: boolean }) {
    const href = c.author_username ? `/u/${c.author_username}` : "#";
    const canDelete = !!viewerId && (viewerId === c.user_id || viewerId === postOwnerId || viewerIsAdmin);
    return (
      <div className="flex gap-2.5">
        <Link href={href} className="shrink-0">
          <Avatar name={c.author_name} src={c.author_avatar} society={c.author_society} size={small ? 26 : 32} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="relative inline-block max-w-full rounded-2xl bg-white/[0.06] px-3 py-2">
            <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-white hover:underline">
              {c.author_name}
              {c.author_society && <SocietySeal size={12} className="h-3 w-3" />}
            </Link>
            <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-slate-200">{c.body}</p>
            {c.like_count > 0 && (
              <span className="absolute -bottom-2.5 right-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0b2238] px-1.5 py-0.5 text-[11px] text-slate-300 shadow">
                <Heart className="h-3 w-3 fill-coral-400 text-coral-400" />
                {c.like_count}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 pl-2 text-xs text-slate-500">
            <span>{timeAgo(c.created_at)}</span>
            <button
              type="button"
              onClick={() => likeComment(c)}
              className={`font-semibold hover:underline ${c.liked ? "text-coral-400" : "text-slate-400"}`}
            >
              Like
            </button>
            <button type="button" onClick={() => startReply(c)} className="font-semibold text-slate-400 hover:underline">
              Reply
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="ml-auto text-slate-600 hover:text-coral-300"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-ocean-800/50 px-3 pb-4 pt-3 font-sans sm:px-5">
      {rows === null ? (
        <p className="flex items-center gap-2 py-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading comments…
        </p>
      ) : (
        <ul className="space-y-4">
          {threads.map(({ c, replies }) => {
            const open = expanded.has(c.id);
            const shown = open ? replies : replies.slice(-REPLIES_SHOWN);
            const hidden = replies.length - shown.length;
            return (
              <li key={c.id}>
                <CommentRow c={c} />
                {replies.length > 0 && (
                  <div className="mt-3 space-y-3 pl-10">
                    {hidden > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded((s) => new Set(s).add(c.id))}
                        className="text-xs font-semibold text-slate-400 hover:underline"
                      >
                        View {hidden} more {hidden === 1 ? "reply" : "replies"}
                      </button>
                    )}
                    {shown.map((r) => (
                      <CommentRow key={r.id} c={r} small />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
          {rows.length === 0 && <li className="text-sm text-slate-500">No comments yet. Start the conversation.</li>}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-coral-300">{error}</p>}

      {viewerId ? (
        <div className="mt-4">
          {replyTo && (
            <p className="mb-1.5 flex items-center gap-2 pl-1 text-xs text-slate-400">
              Replying to <span className="font-semibold text-slate-200">{replyTo.author_name}</span>
              <button
                type="button"
                onClick={() => {
                  setReplyTo(null);
                  setBody("");
                }}
                className="rounded p-0.5 hover:bg-white/10"
                aria-label="Cancel reply"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={box}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder={replyTo ? `Reply to ${replyTo.author_name.split(" ")[0]}…` : "Write a comment…"}
              className="min-h-[42px] flex-1 resize-none rounded-2xl border border-ocean-800/60 bg-ocean-900/60 px-3.5 py-2.5 text-base text-white placeholder-slate-500 focus:border-ocean-500 focus:outline-none sm:text-sm"
            />
            <button
              type="button"
              onClick={send}
              disabled={busy || !body.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-ocean-600 text-white transition-colors hover:bg-ocean-500 disabled:opacity-40"
              aria-label="Send comment"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          <Link href="/login?next=/feed" className="text-ocean-300 hover:text-white">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      )}
    </div>
  );
}
