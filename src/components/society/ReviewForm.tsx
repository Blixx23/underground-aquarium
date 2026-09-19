"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Flag, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const CHECKS = [
  { key: "code1", label: "The challenge code is clearly visible in the stage 1 photo." },
  { key: "code5", label: "The same code is clearly visible in the stage 5 photo." },
  { key: "species", label: "The fish shown match the species claimed." },
  { key: "progression", label: "Eggs, fry and grow-out photos show a believable progression in the same setup." },
] as const;

type CheckKey = (typeof CHECKS)[number]["key"];

/**
 * The reviewer's decision.
 *
 * Approve is only enabled once all four checks are ticked — the database
 * enforces the same rule, this just saves someone a round trip. Deny and
 * escalate need a written reason, because the member reads it.
 */
export default function ReviewForm({
  reviewId,
  minReason,
}: {
  reviewId: string;
  minReason: number;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    code1: false,
    code5: false,
    species: false,
    progression: false,
  });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allChecked = Object.values(checks).every(Boolean);
  const reasonOk = reason.trim().length >= minReason;

  async function cast(vote: "approve" | "deny" | "escalate") {
    setError(null);
    setBusy(vote);
    try {
      const { data, error: rpcErr } = await supabase.rpc("cast_spawn_review", {
        p_review_id: reviewId,
        p_vote: vote,
        p_reason: reason.trim() || null,
        p_code1: checks.code1,
        p_code5: checks.code5,
        p_species: checks.species,
        p_progression: checks.progression,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      if (data === "expired") {
        throw new Error(
          "This review passed its deadline and has been reassigned. Thanks anyway — it's off your list."
        );
      }
      router.push("/society/review?done=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record your vote.");
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-[#04060a] p-5 sm:p-6">
      <h2 className="mb-1 font-display text-lg text-white">Your decision</h2>
      <p className="mb-5 text-sm text-ocean-400">
        You&apos;re reviewing blind — you don&apos;t know whose entry this is,
        and they won&apos;t see who you are. Judge the evidence, nothing else.
      </p>

      <ul className="mb-5 space-y-2">
        {CHECKS.map((c) => (
          <li key={c.key}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3 transition-colors hover:border-amber-500/30">
              <input
                type="checkbox"
                checked={checks[c.key]}
                onChange={(e) =>
                  setChecks((prev) => ({ ...prev, [c.key]: e.target.checked }))
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
              />
              <span className="text-sm text-ocean-200">{c.label}</span>
            </label>
          </li>
        ))}
      </ul>

      <label className="mb-2 block text-sm text-ocean-300">
        Reason{" "}
        <span className="text-ocean-600">
          (required to deny or escalate — the member reads this)
        </span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="What you saw, specifically. e.g. 'The code isn't visible in the stage 5 photo.'"
        className="mb-1 w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-4 py-3 text-base text-white placeholder-ocean-600 focus:border-amber-500/50 focus:outline-none sm:text-sm"
      />
      <p className="mb-5 font-mono text-[10px] uppercase tracking-wider text-ocean-600">
        {reason.trim().length}/{minReason} characters minimum
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-200">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => cast("approve")}
          disabled={!allChecked || busy !== null}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 font-medium text-ocean-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve
        </button>
        <button
          onClick={() => cast("deny")}
          disabled={!reasonOk || busy !== null}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-coral-500 font-medium text-white transition-colors hover:bg-coral-400 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {busy === "deny" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Deny
        </button>
        <button
          onClick={() => cast("escalate")}
          disabled={!reasonOk || busy !== null}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/40 font-medium text-amber-200 transition-colors hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {busy === "escalate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
          Send to judge
        </button>
      </div>
      <p className="mt-3 text-xs text-ocean-600">
        Approve unlocks once all four checks are ticked. Not sure? Send it to
        the judge — asking for help is never counted against you.
      </p>
    </div>
  );
}
