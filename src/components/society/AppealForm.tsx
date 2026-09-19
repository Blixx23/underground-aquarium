"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** One appeal per entry, to the judge, within the appeal window. */
export default function AppealForm({
  logId,
  minReason,
}: {
  logId: string;
  minReason: number;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc("appeal_spawn_log", {
        p_log_id: logId,
        p_reason: reason.trim(),
      });
      if (rpcErr) throw new Error(rpcErr.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't file the appeal.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 px-5 py-2.5 text-sm text-sky-200 transition-colors hover:border-sky-400"
      >
        <Scale className="h-4 w-4" />
        Appeal to the judge
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-5">
      <p className="mb-3 text-sm text-sky-100/80">
        You get one appeal, and the judge&apos;s ruling on it is final. Point to
        exactly what the reviewers missed.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="e.g. 'The code is in the stage 5 photo, bottom left, behind the heater.'"
        className="mb-1 w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-4 py-3 text-base text-white placeholder-ocean-600 focus:border-sky-500/50 focus:outline-none sm:text-sm"
      />
      <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-ocean-600">
        {reason.trim().length}/{minReason} characters minimum
      </p>
      {error && <p className="mb-3 text-sm text-coral-300">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || reason.trim().length < minReason}
        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-ocean-950 transition-colors hover:bg-sky-400 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
        File appeal
      </button>
    </div>
  );
}
