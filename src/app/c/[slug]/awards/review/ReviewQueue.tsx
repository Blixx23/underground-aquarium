"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Fish, Leaf, Check, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ReviewItem = {
  id: string;
  program: string;
  species_name: string;
  event_date: string | null;
  notes: string | null;
  photos: string[];
  created_at: string;
  submitter_name: string;
  suggested_points: number;
};

export default function ReviewQueue({ items: initialItems }: { items: ReviewItem[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [points, setPoints] = useState<Record<string, string>>(
    Object.fromEntries(initialItems.map((i) => [i.id, String(i.suggested_points)]))
  );
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fmtDate(d: string | null) {
    if (!d) return null;
    const dt = new Date(d + "T00:00:00");
    return Number.isNaN(dt.getTime()) ? null : dt.toLocaleDateString();
  }

  async function approve(id: string) {
    setError(null);
    const pts = parseInt(points[id] ?? "0", 10);
    if (Number.isNaN(pts) || pts < 0) {
      setError("Enter a valid (non-negative) point value.");
      return;
    }
    setBusyId(id);
    const { error: rpcErr } = await supabase.rpc("approve_award_submission", {
      p_submission: id,
      p_points: pts,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setBusyId(null);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setBusyId(null);
    router.refresh();
  }

  async function reject(id: string) {
    setError(null);
    setBusyId(id);
    const { error: rpcErr } = await supabase.rpc("reject_award_submission", {
      p_submission: id,
      p_note: note,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setBusyId(null);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setRejectingId(null);
    setNote("");
    setBusyId(null);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-10 text-center">
        <Check className="mx-auto mb-3 h-8 w-8 text-ocean-600" />
        <p className="text-ocean-300">No submissions waiting for review.</p>
      </div>
    );
  }

  const inputClass =
    "rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {error}
        </p>
      )}

      {items.map((it) => {
        const busy = busyId === it.id;
        const date = fmtDate(it.event_date);
        return (
          <div key={it.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-ocean-800/60 px-2.5 py-0.5 text-xs font-medium text-ocean-200">
                {it.program === "hap" ? (
                  <>
                    <Leaf className="h-3 w-3" /> HAP
                  </>
                ) : (
                  <>
                    <Fish className="h-3 w-3" /> BAP
                  </>
                )}
              </span>
              <span className="text-sm text-ocean-400">from {it.submitter_name}</span>
            </div>

            <p className="text-lg font-medium text-white">{it.species_name}</p>
            {date && (
              <p className="text-xs text-ocean-500">
                {it.program === "hap" ? "Propagated" : "Spawned"} {date}
              </p>
            )}

            {it.notes && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg border border-ocean-800/40 bg-ocean-900/40 px-3 py-2 text-sm text-ocean-300">
                {it.notes}
              </p>
            )}

            {it.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {it.photos.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-24 w-24 overflow-hidden rounded-lg border border-ocean-800/60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${it.species_name} photo ${i + 1}`}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            )}

            {rejectingId === it.id ? (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-white">
                  Reason{" "}
                  <span className="font-normal text-ocean-500">
                    (optional, shared with the member)
                  </span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Need a photo of the fry before this can count."
                  className={`${inputClass} w-full resize-y`}
                />
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => reject(it.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Confirm reject
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(null);
                      setNote("");
                    }}
                    disabled={busy}
                    className="rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-200 transition-colors hover:bg-ocean-800/60 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-ocean-300">Points</label>
                  <input
                    type="number"
                    min={0}
                    value={points[it.id] ?? ""}
                    onChange={(e) =>
                      setPoints((prev) => ({ ...prev, [it.id]: e.target.value }))
                    }
                    className={`${inputClass} w-20`}
                  />
                </div>
                <button
                  onClick={() => approve(it.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </button>
                <button
                  onClick={() => {
                    setRejectingId(it.id);
                    setNote("");
                    setError(null);
                  }}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-300 transition-colors hover:bg-ocean-800/60 disabled:opacity-60"
                >
                  <X className="h-4 w-4" /> Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
