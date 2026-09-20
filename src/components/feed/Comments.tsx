"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";
import { timeAgo, type FeedComment } from "@/lib/feed";

/** A post's comments, loaded when opened, with a reply box for signed-in people. */
export default function Comments({
  postId,
  postOwnerId,
  viewerId,
  onCountChange,
}: {
  postId: string;
  postOwnerId: string;
  viewerId: string | null;
  onCountChange: (n: number) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<FeedComment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error: err } = await supabase.rpc("get_feed_comments", { p_post: postId });
    if (err) setError(err.message);
    const list = (data as FeedComment[] | null) ?? [];
    setRows(list);
    onCountChange(list.length);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("add_feed_comment", { p_post: postId, p_body: text });
    if (err) setError(err.message);
    else {
      setBody("");
      await load();
    }
    setBusy(false);
  }

  async function remove(id: string) {
    const { error: err } = await supabase.rpc("delete_feed_comment", { p_id: id });
    if (err) setError(err.message);
    else await load();
  }

  return (
    <div className="border-t border-ocean-800/50 px-4 pb-4 pt-3 sm:px-5">
      {rows === null ? (
        <p className="flex items-center gap-2 py-2 text-sm text-ocean-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading comments…
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const href = c.author_username ? `/u/${c.author_username}` : "#";
            const canDelete = viewerId && (viewerId === c.user_id || viewerId === postOwnerId);
            return (
              <li key={c.id} className="group flex gap-2.5">
                <Link href={href}>
                  <Avatar name={c.author_name} src={c.author_avatar} society={c.author_society} size={30} />
                </Link>
                <div className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={href}
                      className={`truncate text-sm font-medium hover:underline text-white`}
                    >
                      {c.author_name}
                    </Link>
                    <span className="shrink-0 text-xs text-ocean-600">{timeAgo(c.created_at)}</span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="ml-auto shrink-0 text-ocean-600 opacity-0 transition-opacity hover:text-coral-300 group-hover:opacity-100"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-ocean-200">{c.body}</p>
                </div>
              </li>
            );
          })}
          {rows.length === 0 && <li className="text-sm text-ocean-500">No comments yet.</li>}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}

      {viewerId ? (
        <div className="mt-3 flex items-end gap-2">
          <textarea
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
            placeholder="Write a comment…"
            className="min-h-[40px] flex-1 resize-none rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-base text-white placeholder-ocean-600 focus:border-ocean-500 focus:outline-none sm:text-sm"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !body.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ocean-600 text-white transition-colors hover:bg-ocean-500 disabled:opacity-40"
            aria-label="Send comment"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ocean-500">
          <Link href="/login" className="text-ocean-300 hover:text-white">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      )}
    </div>
  );
}
