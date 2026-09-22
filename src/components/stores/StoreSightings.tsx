"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Sighting = {
  id: string;
  userId: string;
  author: string;
  username: string | null;
  body: string;
  createdAt: string;
};

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/**
 * "Spotted in stock": shoppers say what they saw on the shelves, so the
 * next person knows before they drive over.
 */
export default function StoreSightings({
  storeId,
  storeName,
  initial,
  currentUserId,
  currentUserName,
}: {
  storeId: string;
  storeName: string;
  initial: Sighting[];
  currentUserId: string | null;
  currentUserName: string | null;
}) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    const text = body.trim();
    if (text.length < 3 || !currentUserId) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("store_sightings")
      .insert({ store_id: storeId, user_id: currentUserId, body: text })
      .select("id, created_at")
      .single();
    setBusy(false);
    if (err || !data) {
      setError(err?.message ?? "Couldn't post that. Try again.");
      return;
    }
    setItems((prev) => [
      {
        id: data.id as string,
        userId: currentUserId,
        author: currentUserName ?? "You",
        username: null,
        body: text,
        createdAt: data.created_at as string,
      },
      ...prev,
    ]);
    setBody("");
  }

  async function remove(id: string) {
    const { error: err } = await supabase.from("store_sightings").delete().eq("id", id);
    if (!err) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <section className="mb-10">
      <div className="mb-1 flex items-center gap-2">
        <Eye className="h-5 w-5 text-cyan-300" />
        <h2 className="font-display text-xl text-white">Spotted in stock</h2>
      </div>
      <p className="mb-4 text-sm text-ocean-400">
        What shoppers saw at {storeName} lately. Stock changes fast, so newer is better.
      </p>

      {currentUserId ? (
        <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 280))}
            rows={2}
            placeholder="Been here recently? e.g. “Big batch of cherry shrimp, $4 each. Nice dwarf sag too.”"
            className="w-full resize-none bg-transparent text-sm text-white placeholder-ocean-500 outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-ocean-500">{body.length}/280</span>
            <button
              type="button"
              onClick={post}
              disabled={busy || body.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-cyan-400 disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Share
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
        </div>
      ) : (
        <p className="mb-4 text-sm text-ocean-400">
          <Link href="/login" className="text-cyan-300 hover:underline">
            Sign in
          </Link>{" "}
          to share what you saw here.
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ocean-800/60 px-4 py-6 text-center text-sm text-ocean-500">
          Nothing spotted yet. Be the first to say what&apos;s in the tanks.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ocean-100">{s.body}</p>
              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-ocean-500">
                <span>
                  {s.username ? (
                    <Link href={`/u/${s.username}`} className="hover:text-ocean-200">
                      {s.author}
                    </Link>
                  ) : (
                    s.author
                  )}{" "}
                  · {ago(s.createdAt)}
                </span>
                {s.userId === currentUserId && (
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="inline-flex items-center gap-1 text-ocean-500 hover:text-coral-300"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
