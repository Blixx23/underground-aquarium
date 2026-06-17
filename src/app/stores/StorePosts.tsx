"use client";

import { useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Post = {
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
};

export default function StorePosts({
  storeId,
  initialPosts,
  isOwner,
  currentUserId,
}: {
  storeId: string;
  initialPosts: Post[];
  isOwner: boolean;
  currentUserId: string | null;
}) {
  const [supabase] = useState(() => createClient());
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  const [composing, setComposing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner && posts.length === 0) return null;

  async function createPost() {
    const text = newBody.trim();
    if (!text || busy || !currentUserId) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("store_posts")
        .insert({
          store_id: storeId,
          user_id: currentUserId,
          title: newTitle.trim() || null,
          body: text,
        })
        .select("id,created_at")
        .single();
      if (insertError) throw insertError;
      const row = data as { id: string; created_at: string };
      setPosts((prev) => [
        {
          id: row.id,
          title: newTitle.trim() || null,
          body: text,
          createdAt: row.created_at,
        },
        ...prev,
      ]);
      setNewTitle("");
      setNewBody("");
      setComposing(false);
    } catch {
      setError("Couldn't post that update. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: Post) {
    setEditingId(p.id);
    setEditTitle(p.title ?? "");
    setEditBody(p.body);
  }

  async function saveEdit(id: string) {
    const text = editBody.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const { error: upError } = await supabase
        .from("store_posts")
        .update({
          title: editTitle.trim() || null,
          body: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (upError) throw upError;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, title: editTitle.trim() || null, body: text }
            : p
        )
      );
      setEditingId(null);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  async function removePost(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const { error: delError } = await supabase
        .from("store_posts")
        .delete()
        .eq("id", id);
      if (delError) throw delError;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40";

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl text-emerald-400 flex items-center gap-2">
          <Megaphone className="w-5 h-5" /> From the shop
        </h2>
        {isOwner && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Post an update
          </button>
        )}
      </div>

      {isOwner && composing && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-medium">New update</p>
            <button
              onClick={() => {
                setComposing(false);
                setNewTitle("");
                setNewBody("");
              }}
              aria-label="Close"
              className="text-ocean-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (optional) — e.g. Weekend restock"
              className={inputClass}
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              placeholder="What's new? New shipment, sale, event…"
              className={inputClass}
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              onClick={createPost}
              disabled={busy || !newBody.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post update"}
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        isOwner &&
        !composing && (
          <p className="text-ocean-400 text-sm">
            No updates yet — post a restock or event to keep customers in the
            loop.
          </p>
        )
      ) : (
        <div className="space-y-3">
          {posts.map((p) =>
            editingId === p.id ? (
              <div
                key={p.id}
                className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
              >
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className={inputClass}
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(p.id)}
                    disabled={busy || !editBody.trim()}
                    className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-white/10 text-ocean-300 px-3 py-1.5 text-xs hover:text-white hover:border-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={p.id}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {p.title && (
                      <p className="text-white text-sm font-medium">
                        {p.title}
                      </p>
                    )}
                    <p className="text-ocean-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        aria-label="Edit update"
                        className="text-ocean-400 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removePost(p.id)}
                        aria-label="Delete update"
                        disabled={busy}
                        className="text-ocean-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-ocean-200 text-sm mt-2 whitespace-pre-wrap">
                  {p.body}
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}