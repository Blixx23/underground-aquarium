"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Trash2, Reply, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Review = {
  id: string;
  userId: string;
  authorName: string;
  rating: number;
  body: string | null;
  createdAt: string;
  response: string | null;
};

export default function StoreReviews({
  storeId,
  initialReviews,
  currentUserId,
  currentUserName,
  isOwner,
}: {
  storeId: string;
  initialReviews: Review[];
  currentUserId: string | null;
  currentUserName: string | null;
  isOwner: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [respBusy, setRespBusy] = useState(false);

  const myReview = currentUserId
    ? reviews.find((r) => r.userId === currentUserId) ?? null
    : null;

  const count = reviews.length;
  const avg =
    count > 0
      ? Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10
        ) / 10
      : 0;

  async function submit() {
    if (busy || !currentUserId || rating < 1) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("store_reviews")
        .insert({
          store_id: storeId,
          user_id: currentUserId,
          rating,
          body: body.trim() || null,
        })
        .select("id,created_at")
        .single();
      if (insertError) throw insertError;
      const row = data as { id: string; created_at: string };
      setReviews((prev) => [
        {
          id: row.id,
          userId: currentUserId,
          authorName: currentUserName || "You",
          rating,
          body: body.trim() || null,
          createdAt: row.created_at,
          response: null,
        },
        ...prev,
      ]);
      // Notify the store owner by email (fire and forget)
      fetch("/api/stores/notify-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: row.id }),
      }).catch(() => {});
      setRating(0);
      setBody("");
    } catch {
      setError(
        "Couldn't post your review. You may have already reviewed this store."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeReview(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const { error: delError } = await supabase
        .from("store_reviews")
        .delete()
        .eq("id", id);
      if (delError) throw delError;
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  function startRespond(id: string, existing: string | null) {
    setRespondingId(id);
    setDraft(existing ?? "");
  }

  async function saveResponse(id: string) {
    const text = draft.trim();
    if (!text || respBusy || !currentUserId) return;
    setRespBusy(true);
    try {
      const { error: upError } = await supabase.from("review_responses").upsert(
        {
          review_id: id,
          store_id: storeId,
          user_id: currentUserId,
          body: text,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "review_id" }
      );
      if (upError) throw upError;
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, response: text } : r))
      );
      // Let the reviewer know the shop replied (fire and forget).
      fetch("/api/stores/notify-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: id }),
      }).catch(() => {});
      setRespondingId(null);
      setDraft("");
    } catch {
      // ignore
    } finally {
      setRespBusy(false);
    }
  }

  async function deleteResponse(id: string) {
    if (respBusy) return;
    setRespBusy(true);
    try {
      const { error: delError } = await supabase
        .from("review_responses")
        .delete()
        .eq("review_id", id);
      if (delError) throw delError;
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, response: null } : r))
      );
    } catch {
      // ignore
    } finally {
      setRespBusy(false);
    }
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl text-emerald-400">
          Reviews{count > 0 ? ` (${count})` : ""}
        </h2>
        {count > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-white font-medium">{avg}</span>
            <span className="text-ocean-400">/ 5</span>
          </div>
        )}
      </div>

      {count === 0 ? (
        <p className="text-ocean-400 text-sm mb-6">
          No reviews yet{isOwner ? "." : " — be the first to leave one."}
        </p>
      ) : (
        <div className="space-y-3 mb-6">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-xl bg-white/5 border border-white/10 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {r.authorName}
                  </p>
                  <div className="flex items-center shrink-0">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={
                          "w-3.5 h-3.5 " +
                          (n <= r.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-ocean-600")
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-ocean-500 text-xs">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  {r.userId === currentUserId && (
                    <button
                      onClick={() => removeReview(r.id)}
                      aria-label="Delete review"
                      disabled={busy}
                      className="text-ocean-500 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {r.body && (
                <p className="text-ocean-200 text-sm mt-2 whitespace-pre-wrap">
                  {r.body}
                </p>
              )}

              {respondingId === r.id ? (
                <div className="mt-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="Reply as the owner…"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveResponse(r.id)}
                      disabled={respBusy || !draft.trim()}
                      className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    >
                      {respBusy ? "Saving…" : "Save response"}
                    </button>
                    <button
                      onClick={() => {
                        setRespondingId(null);
                        setDraft("");
                      }}
                      className="rounded-lg border border-white/10 text-ocean-300 px-3 py-1.5 text-xs hover:text-white hover:border-white/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : r.response ? (
                <div className="mt-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-emerald-300 text-xs font-medium uppercase tracking-wide">
                      Owner&apos;s response
                    </p>
                    {isOwner && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startRespond(r.id, r.response)}
                          aria-label="Edit response"
                          className="text-ocean-400 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteResponse(r.id)}
                          aria-label="Delete response"
                          disabled={respBusy}
                          className="text-ocean-400 hover:text-red-300 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-ocean-200 text-sm whitespace-pre-wrap">
                    {r.response}
                  </p>
                </div>
              ) : (
                isOwner && (
                  <button
                    onClick={() => startRespond(r.id, null)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" /> Respond
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {!currentUserId ? (
        <p className="text-sm text-ocean-300">
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in
          </Link>{" "}
          to leave a review.
        </p>
      ) : isOwner ? (
        <p className="text-sm text-ocean-400">
          You manage this listing, so you can&apos;t review it yourself — but
          you can respond to reviews above.
        </p>
      ) : myReview ? (
        <p className="text-sm text-ocean-400">
          You&apos;ve reviewed this store. Thanks for sharing!
        </p>
      ) : (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <p className="text-white font-medium mb-3">Leave a review</p>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} star`}
                className="p-0.5"
              >
                <Star
                  className={
                    "w-6 h-6 transition-colors " +
                    ((hover || rating) >= n
                      ? "fill-amber-400 text-amber-400"
                      : "text-ocean-600 hover:text-ocean-400")
                  }
                />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="How was your visit? (optional)"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
          />
          {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
          <div className="mt-3">
            <button
              onClick={submit}
              disabled={busy || rating < 1}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}