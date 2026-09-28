"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, Loader2, Flag, ExternalLink, EyeOff, Lock } from "lucide-react";

export type QueueTankReport = {
  id: string;
  tank_id: string | null;
  tank_name: string | null;
  tank_image: string | null;
  tank_is_public: boolean;
  tank_missing: boolean;
  owner_username: string | null;
  owner_name: string | null;
  reason: string | null;
  created_at: string | null;
  reporter_username: string | null;
  reporter_name: string | null;
};

type Action = "dismiss" | "resolve" | "make_private";

function whenLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminTankReportsList({
  initialReports,
}: {
  initialReports: QueueTankReport[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<QueueTankReport[]>(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: Action, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/tank-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      // Making a tank private closes every open report on that tank, so
      // drop all of them from the list, not just the one clicked.
      const closed = new Set<string>(Array.isArray(data.closed) ? data.closed : [id]);
      setItems((prev) => prev.filter((r) => !closed.has(r.id)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400">
        No tank reports waiting for review.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-coral-300 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}
      {items.map((r) => {
        const who = r.reporter_username
          ? `@${r.reporter_username}`
          : r.reporter_name || "a member";
        const owner = r.owner_username ? `@${r.owner_username}` : r.owner_name || "a member";
        const when = whenLabel(r.created_at);
        const busy = busyId === r.id;
        const heading = r.tank_missing ? "Tank no longer exists" : r.tank_name || "Untitled tank";

        return (
          <div key={r.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
            <div className="flex items-start gap-4">
              {r.tank_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.tank_image}
                  alt={heading}
                  loading="lazy"
                  className="w-12 h-12 rounded-xl bg-ocean-950 object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-ocean-800/50 shrink-0 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-coral-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide rounded-full bg-ocean-800/60 text-ocean-300 px-2 py-0.5">
                    {r.tank_missing ? "deleted" : r.tank_is_public ? "public" : "private"}
                  </span>
                  <h3 className="text-white font-medium break-words">{heading}</h3>
                </div>
                {!r.tank_missing && r.tank_id && (
                  <p className="text-sm mt-1">
                    <Link
                      href={`/tanks/${r.tank_id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 break-words"
                    >
                      View tank
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                    <span className="text-ocean-500"> · owned by {owner}</span>
                  </p>
                )}
                <p className="text-xs text-ocean-500 mt-1">
                  Reported by {who}
                  {when ? ` · ${when}` : ""}
                </p>
                <p className="text-sm text-ocean-200 mt-2 whitespace-pre-line break-words">
                  {r.reason ? `Reason: ${r.reason}` : "No reason given."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {!r.tank_missing && r.tank_is_public && (
                <button
                  onClick={() =>
                    act(
                      r.id,
                      "make_private",
                      "Make this tank private? It will disappear from the community and the owner will be notified."
                    )
                  }
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-coral-500/50 bg-coral-500/10 px-4 py-1.5 text-sm font-medium text-coral-300 hover:bg-coral-500/20 transition-colors disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
                  Make tank private
                </button>
              )}
              {!r.tank_missing && !r.tank_is_public && (
                <span className="inline-flex items-center gap-1.5 text-sm text-ocean-500">
                  <Lock className="w-4 h-4" /> Already private
                </span>
              )}
              <button
                onClick={() => act(r.id, "dismiss", "Dismiss this report? No action will be taken.")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-300 hover:text-white hover:border-ocean-500 transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" /> Dismiss
              </button>
              <button
                onClick={() => act(r.id, "resolve")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm text-ocean-500 hover:text-ocean-300 transition-colors disabled:opacity-50"
                title="Close this report without an automatic action, for things you've already handled."
              >
                <Check className="w-4 h-4" /> Mark resolved
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
