"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  X,
  Loader2,
  Flag,
  ExternalLink,
  EyeOff,
  Ban,
} from "lucide-react";

type QueueReport = {
  id: string;
  target_type: string | null;
  target_label: string | null;
  target_url: string | null;
  reason: string | null;
  details: string | null;
  created_at: string | null;
  reporter_username: string | null;
  reporter_name: string | null;
};

type Action = "remove" | "resolve" | "dismiss" | "hide_post" | "hide_thread";

type PrimaryAction = {
  action: Action;
  label: string;
  Icon: typeof EyeOff;
  confirm: string;
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

function TargetLink({ url, label }: { url: string; label: string }) {
  const isExternal = /^https?:\/\//i.test(url);
  const className =
    "inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 break-words";
  if (isExternal) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={className}>
        {label}
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </a>
    );
  }
  return (
    <Link href={url} target="_blank" className={className}>
      {label}
      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
    </Link>
  );
}

export default function AdminReportsList({
  initialReports,
}: {
  initialReports: QueueReport[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<QueueReport[]>(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: Action, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setItems((prev) => prev.filter((r) => r.id !== id));
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
        No reports waiting for review.
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
        const when = whenLabel(r.created_at);
        const busy = busyId === r.id;
        const heading = r.target_label || r.target_url || "Reported content";

        // The take-down options depend on what was reported. Forum posts get
        // two choices; listings/profiles get one; everything else only
        // resolve/dismiss.
        const primaryActions: PrimaryAction[] =
          r.target_type === "listing"
            ? [
                {
                  action: "remove",
                  label: "Take down listing",
                  Icon: EyeOff,
                  confirm:
                    "Take down this listing? It will be hidden from the marketplace and the seller will be notified.",
                },
              ]
            : r.target_type === "profile"
            ? [
                {
                  action: "remove",
                  label: "Suspend account",
                  Icon: Ban,
                  confirm:
                    "Suspend this account? Their profile and listings will be hidden and they will be notified.",
                },
              ]
            : r.target_type === "forum_post"
            ? [
                {
                  action: "hide_post",
                  label: "Hide post",
                  Icon: EyeOff,
                  confirm:
                    "Hide just this post/comment? It will be removed from the thread and the author will be notified.",
                },
                {
                  action: "hide_thread",
                  label: "Hide thread",
                  Icon: EyeOff,
                  confirm:
                    "Hide the entire thread? The whole discussion will be removed and the author will be notified.",
                },
              ]
            : [];

        return (
          <div
            key={r.id}
            className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-ocean-800/50 shrink-0 flex items-center justify-center">
                <Flag className="w-5 h-5 text-coral-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {r.target_type && (
                    <span className="text-[11px] uppercase tracking-wide rounded-full bg-ocean-800/60 text-ocean-300 px-2 py-0.5">
                      {r.target_type}
                    </span>
                  )}
                  <h3 className="text-white font-medium break-words">
                    {heading}
                  </h3>
                </div>
                {r.target_url && (
                  <p className="text-sm mt-1">
                    <TargetLink url={r.target_url} label="View reported item" />
                  </p>
                )}
                <p className="text-xs text-ocean-500 mt-1">
                  Reported by {who}
                  {when ? ` · ${when}` : ""}
                </p>
                {r.reason && (
                  <p className="text-sm text-ocean-200 mt-2">
                    Reason: {r.reason}
                  </p>
                )}
                {r.details && (
                  <p className="text-sm text-ocean-300 mt-1 whitespace-pre-line break-words">
                    {r.details}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {primaryActions.map((p) => (
                <button
                  key={p.action}
                  onClick={() => act(r.id, p.action, p.confirm)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-coral-500/50 bg-coral-500/10 px-4 py-1.5 text-sm font-medium text-coral-300 hover:bg-coral-500/20 transition-colors disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <p.Icon className="w-4 h-4" />
                  )}
                  {p.label}
                </button>
              ))}
              <button
                onClick={() =>
                  act(
                    r.id,
                    "dismiss",
                    "Dismiss this report? No action will be taken."
                  )
                }
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-300 hover:text-white hover:border-ocean-500 transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" /> Dismiss
              </button>
              <button
                onClick={() => act(r.id, "resolve")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm text-ocean-500 hover:text-ocean-300 transition-colors disabled:opacity-50"
                title="Close this report without an automatic action — for things you've already handled."
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
