"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE" && ack;

  async function handleDelete() {
    if (!canDelete || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Couldn't delete your account. Please try again.");
        setBusy(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      setScheduledFor(data.deletion_scheduled_for ?? null);
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  if (scheduledFor) {
    const when = new Date(scheduledFor).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return (
      <section className="mt-5 rounded-2xl border border-coral-500/30 bg-coral-500/10 p-6">
        <h2 className="font-medium text-coral-100">Account scheduled for deletion</h2>
        <p className="mt-1 text-sm text-coral-200/90">
          Your account has been deactivated and your listings and public content
          are now hidden. It will be permanently deleted on{" "}
          <span className="font-medium text-white">{when}</span>. To cancel,
          email us before then. You&apos;ve been signed out.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-600"
        >
          Return home
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-coral-500/30 bg-coral-500/5 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-coral-500/15 text-coral-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-white">Delete account</h2>
          <p className="mt-1 text-sm text-ocean-400">
            This deactivates your account right away and hides your profile,
            listings, and public tanks. After 30 days your personal data is
            permanently deleted. Completed order records are kept for legal and
            tax purposes, with your personal details removed.
          </p>

          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-coral-500/40 px-4 py-2 text-sm font-medium text-coral-200 transition-colors hover:bg-coral-500/15"
            >
              Delete account
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-ocean-400">
                  Type <span className="font-mono text-coral-200">DELETE</span> to
                  confirm
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full max-w-xs rounded-lg border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:border-coral-500 focus:outline-none"
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-ocean-200">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-ocean-700 bg-ocean-900 accent-coral-500"
                />
                I understand this is permanent and that completed order records
                are retained.
              </label>

              {error && (
                <p className="rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-200">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={!canDelete || busy}
                  className="inline-flex items-center gap-2 rounded-full bg-coral-500/90 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? "Deleting…" : "Permanently delete my account"}
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                    setConfirmText("");
                    setAck(false);
                  }}
                  disabled={busy}
                  className="rounded-full bg-ocean-800 px-4 py-2 text-sm text-ocean-200 transition-colors hover:bg-ocean-700 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
