"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type Row = { email: string; reason: string; detail: string | null; created_at: string };

const WHY: Record<string, string> = {
  bounce: "Bounced",
  complaint: "Marked as spam",
  unsubscribe: "Unsubscribed",
  manual: "Added by hand",
  invalid: "Address doesn't work",
};

/**
 * Which reasons only stop marketing. Kept in step with scopeOf() in
 * lib/email/suppress.ts, which is what the sender actually checks. That
 * file is server-only, so this client list repeats the two names.
 */
const MARKETING_ONLY = new Set(["unsubscribe", "complaint"]);

/**
 * The do-not-email list. A bounce blocks everything; an unsubscribe or a
 * spam complaint only blocks marketing and outreach, so account and
 * message email still reaches that person. Removing one is deliberate:
 * it only makes sense when you know why it got here (a typo fixed, a
 * shop that asked to be put back on).
 */
export default function SuppressionList({ rows, total }: { rows: Row[]; total: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState("");

  async function post(payload: Record<string, unknown>) {
    await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="font-medium text-white">Do not email</h2>
        <span className="text-xs text-ocean-500">{total} total</span>
      </div>
      <p className="mb-4 text-sm text-ocean-400">
        Bounces, spam complaints and unsubscribes land here automatically. A bounced address gets nothing at all.
        An unsubscribe or spam complaint only stops marketing and outreach; account and message emails still go to them.
        Addresses you add by hand get nothing at all.
      </p>

      <div className="mb-4 flex gap-2">
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="add an address"
          className="min-w-0 flex-1 rounded-lg border border-ocean-700 bg-ocean-950 px-3 py-2 text-sm text-white placeholder:text-ocean-600"
        />
        <button
          type="button"
          disabled={!adding.includes("@")}
          onClick={async () => {
            await post({ action: "suppress", email: adding });
            setAdding("");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ocean-700 px-3 py-2 text-sm text-ocean-200 hover:text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ocean-800/60 p-6 text-center text-sm text-ocean-500">
          Nobody yet.
        </p>
      ) : (
        <ul className="divide-y divide-ocean-800/50">
          {rows.map((r) => (
            <li key={r.email} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm text-ocean-100">{r.email}</span>
                  {MARKETING_ONLY.has(r.reason) ? (
                    <span className="rounded-full border border-amber-500/40 px-1.5 text-[10px] uppercase tracking-wider text-amber-300">
                      marketing only
                    </span>
                  ) : (
                    <span className="rounded-full border border-red-500/40 px-1.5 text-[10px] uppercase tracking-wider text-red-300">
                      all email
                    </span>
                  )}
                </span>
                <span className="block text-xs text-ocean-500">
                  {WHY[r.reason] ?? r.reason} · {new Date(r.created_at).toLocaleDateString()}
                  {r.detail ? ` · ${r.detail.slice(0, 60)}` : ""}
                </span>
              </span>
              <button
                type="button"
                disabled={busy === r.email}
                onClick={async () => {
                  setBusy(r.email);
                  await post({ action: "unsuppress", email: r.email });
                  setBusy(null);
                }}
                title="Allow email to this address again"
                className="shrink-0 rounded-lg border border-ocean-800 p-1.5 text-ocean-400 hover:text-white disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
