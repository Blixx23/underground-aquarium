"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  userId: string;
  authorName: string;
  authorUsername: string | null;
  body: string;
  createdAt: string;
};

export default function TankComments({
  tankId,
  initialComments,
  currentUserId,
  currentUserName,
  currentUserUsername,
  isOwner,
}: {
  tankId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserUsername: string | null;
  isOwner: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    const text = body.trim();
    if (!text || busy || !currentUserId) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("tank_comments")
        .insert({ tank_id: tankId, user_id: currentUserId, body: text })
        .select("id,created_at")
        .single();
      if (insertError) throw insertError;
      const row = data as { id: string; created_at: string };
      setComments((prev) => [
        ...prev,
        {
          id: row.id,
          userId: currentUserId,
          authorName: currentUserName || "You",
          authorUsername: currentUserUsername,
          body: text,
          createdAt: row.created_at,
        },
      ]);
      setBody("");
    } catch {
      setError("Couldn't post — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const { error: delError } = await supabase
        .from("tank_comments")
        .delete()
        .eq("id", id);
      if (delError) throw delError;
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-emerald-400 mb-4">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      {comments.length === 0 ? (
        <p className="text-ocean-400 text-sm mb-6">
          No comments yet — be the first to say something.
        </p>
      ) : (
        <div className="space-y-3 mb-6">
          {comments.map((c) => {
            const canDelete = isOwner || c.userId === currentUserId;
            return (
              <div
                key={c.id}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  {c.authorUsername ? (
                    <Link
                      href={`/u/${c.authorUsername}`}
                      className="text-white text-sm font-medium hover:text-emerald-300 transition-colors"
                    >
                      {c.authorName}
                    </Link>
                  ) : (
                    <p className="text-white text-sm font-medium">
                      {c.authorName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-ocean-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => remove(c.id)}
                        aria-label="Delete comment"
                        disabled={busy}
                        className="text-ocean-500 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-ocean-200 text-sm mt-1 whitespace-pre-wrap">
                  {c.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {currentUserId ? (
        <div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add a comment…"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
          />
          {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
          <div className="mt-2">
            <button
              onClick={post}
              disabled={busy || !body.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post comment"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ocean-300">
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
    </div>
  );
}