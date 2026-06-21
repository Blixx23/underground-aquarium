"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Flag, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const REASONS = [
  "Spam",
  "Scam or fraud",
  "Prohibited or illegal",
  "Offensive or inappropriate",
  "Misleading or inaccurate",
  "Other",
];

export default function ReportButton({
  targetType,
  targetId,
  targetLabel,
  targetUrl,
  className,
}: {
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  targetUrl?: string | null;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setError(null);
    if (signedIn === null) {
      setChecking(true);
      try {
        const { data } = await supabase.auth.getUser();
        setSignedIn(Boolean(data.user));
      } catch {
        setSignedIn(false);
      } finally {
        setChecking(false);
      }
    }
  }

  async function submit() {
    if (!reason) {
      setError("Pick a reason.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId ?? null,
          target_label: targetLabel ?? null,
          target_url: targetUrl ?? null,
          reason,
          details: details.trim() || null,
        }),
      });
      if (res.status === 401) {
        setSignedIn(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't send the report.");
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't send the report."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const signInHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggleOpen}
        className="inline-flex items-center gap-1.5 text-xs text-ocean-600 hover:text-coral-300 transition-colors"
      >
        <Flag className="w-3.5 h-3.5" /> Report
      </button>

      {open && (
        <div className="mt-2 w-full max-w-sm rounded-xl border border-ocean-800/60 bg-ocean-900/70 p-3">
          {checking ? (
            <p className="text-xs text-ocean-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> One moment…
            </p>
          ) : signedIn === false ? (
            <p className="text-xs text-ocean-300">
              You need to be signed in to report.{" "}
              <Link
                href={signInHref}
                className="text-emerald-400 hover:text-emerald-300"
              >
                Sign in
              </Link>
              .
            </p>
          ) : done ? (
            <p className="text-xs text-emerald-300">
              Thanks — this has been sent to our moderators.
            </p>
          ) : (
            <div className="space-y-2">
              {error && <p className="text-xs text-coral-300">{error}</p>}
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-ocean-500"
              >
                <option value="">Reason…</option>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Anything else? (optional)"
                rows={3}
                className="w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-2 py-1.5 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-3 py-1 text-xs font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
                >
                  {submitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Send report
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs text-ocean-500 hover:text-ocean-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
