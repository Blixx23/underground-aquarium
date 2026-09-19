"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Check, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * The judge's ruling. Final — there's no appeal from here.
 *
 * Points default to the species' list value. Setting a different number,
 * or approving something that isn't on the list, needs a note saying why,
 * so a ruling can always be explained later.
 */
export default function JudgePanel({
  logId,
  listPoints,
  judgeReason,
  appealReason,
}: {
  logId: string;
  listPoints: number | null;
  judgeReason: string | null;
  appealReason: string | null;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [points, setPoints] = useState(listPoints ? String(listPoints) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setError(null);
    setBusy(decision);
    try {
      const pts = parseInt(points, 10);
      const { error: rpcErr } = await supabase.rpc("judge_spawn_log", {
        p_log_id: logId,
        p_decision: decision,
        p_points: decision === "approve" && Number.isFinite(pts) ? pts : null,
        p_note: note.trim() || null,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record the ruling.");
      setBusy(null);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-amber-400/50 bg-[#04060a] p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Gavel className="h-5 w-5 text-amber-300" />
        <h2 className="font-display text-lg text-white">Judge&apos;s ruling</h2>
      </div>

      {judgeReason && (
        <p className="mb-2 text-sm text-amber-100/70">
          <span className="text-amber-300">Why it&apos;s here:</span> {judgeReason}
        </p>
      )}
      {appealReason && (
        <p className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <span className="font-medium">Member&apos;s appeal:</span> {appealReason}
        </p>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-[140px_1fr]">
        <div>
          <label className="mb-2 block text-sm text-ocean-300">Points</label>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder={listPoints ? String(listPoints) : "Set"}
            className="w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-4 py-3 text-base text-white focus:border-amber-500/50 focus:outline-none sm:text-sm"
          />
          <p className="mt-1 text-xs text-ocean-600">
            {listPoints ? `List value ${listPoints}` : "Not on the list"}
          </p>
        </div>
        <div>
          <label className="mb-2 block text-sm text-ocean-300">
            Note <span className="text-ocean-600">(the member reads this)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Required to reject, or to set points off the list."
            className="w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-4 py-3 text-base text-white placeholder-ocean-600 focus:border-amber-500/50 focus:outline-none sm:text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-200">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => decide("approve")}
          disabled={busy !== null}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 font-medium text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
        >
          {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve
        </button>
        <button
          onClick={() => decide("reject")}
          disabled={busy !== null}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-coral-500 font-medium text-white transition-colors hover:bg-coral-400 disabled:opacity-40"
        >
          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Reject
        </button>
      </div>
      <p className="mt-3 text-xs text-ocean-600">
        Rulings are final and can&apos;t be appealed. First in Society records
        are awarded the 50% bonus automatically on approval.
      </p>
    </div>
  );
}
