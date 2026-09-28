"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Ban } from "lucide-react";

export type SuspendedMember = {
  id: string;
  username: string | null;
  full_name: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
};

function whenLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Everyone currently suspended, with an Unsuspend button. Suspending happens
 * from a profile report above; this is where it gets undone.
 */
export default function SuspendedMembersList({
  initialMembers,
}: {
  initialMembers: SuspendedMember[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<SuspendedMember[]>(initialMembers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function unsuspend(m: SuspendedMember) {
    const who = m.username ? `@${m.username}` : m.full_name || "this member";
    if (
      !confirm(
        `Unsuspend ${who}? They will be able to sign in again, their public profile comes back, and the classified ads and tanks that the suspension hid are restored (ads past their expiry date come back as expired). They will be notified.`
      )
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    setBusyId(m.id);
    try {
      const res = await fetch("/api/admin/members/suspension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: m.id, action: "unsuspend" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setItems((prev) => prev.filter((x) => x.id !== m.id));
      setNotice(
        `${who} is unsuspended. Restored ${data.ads ?? 0} live ${
          data.ads === 1 ? "ad" : "ads"
        } and ${data.tanks ?? 0} public ${data.tanks === 1 ? "tank" : "tanks"}.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl text-white mb-1">
        Suspended accounts
      </h2>
      <p className="text-ocean-400 text-sm mb-5">
        Members who are blocked from signing in. Unsuspending lets them back in
        and restores what the suspension hid.
      </p>

      {error && (
        <p className="mb-4 text-sm text-coral-300 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-4 text-sm text-emerald-300 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
          {notice}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-8 text-center text-ocean-400">
          No suspended accounts.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((m) => {
            const busy = busyId === m.id;
            const when = whenLabel(m.suspended_at);
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-ocean-800/50 shrink-0 flex items-center justify-center">
                  <Ban className="w-4 h-4 text-coral-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium break-words">
                    {m.full_name || (m.username ? `@${m.username}` : "Member")}
                    {m.username && m.full_name && (
                      <span className="text-ocean-400 font-normal">
                        {" "}
                        @{m.username}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ocean-500 mt-0.5">
                    {when ? `Suspended ${when}` : "Suspended"}
                    {m.suspended_reason ? ` · Reason: ${m.suspended_reason}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => unsuspend(m)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Unsuspend
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
