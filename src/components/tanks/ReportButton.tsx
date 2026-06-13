"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ReportButton({ tankId }: { tankId: string }) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const { data } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("tank_reports").insert({
        tank_id: tankId,
        reason: reason.trim() || null,
        reporter_id: data.user?.id ?? null,
      });
      if (insertError) throw insertError;
      setDone(true);
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="text-xs text-ocean-500">
        Thanks — this tank has been reported for review.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-ocean-500 hover:text-ocean-300 transition-colors"
      >
        <Flag className="w-3.5 h-3.5" /> Report this tank
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 max-w-sm">
      <p className="text-sm text-white font-medium mb-1">Report this tank</p>
      <p className="text-xs text-ocean-400 mb-3">
        Tell us what&apos;s wrong (optional). We review every report.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Reason (optional)…"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-ocean-500 focus:outline-none focus:border-emerald-500/40 mb-3"
      />
      {error && (
        <p className="text-xs text-red-300 mb-2">
          Couldn&apos;t submit — please try again.
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 px-3 py-1.5 text-sm hover:bg-red-500/25 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(false);
          }}
          className="rounded-lg border border-white/10 text-ocean-300 px-3 py-1.5 text-sm hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}