"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Loader2, ExternalLink, Mail, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Claim = {
  id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_city: string | null;
  store_state: string | null;
  already_owned: boolean;
  user_id: string;
  user_name: string;
  username: string | null;
  contact_email: string | null;
  proof: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

/** Approve or turn down the people asking to manage a shop. */
export default function AdminClaimsList({ claims, view }: { claims: Claim[]; view: string }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState(claims);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    setError(null);
    const { error: err } = await supabase.rpc("decide_store_claim", {
      p_claim: id,
      p_approve: approve,
      p_note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    setRows((r) => r.filter((c) => c.id !== id));
  }

  async function release(storeId: string) {
    if (!window.confirm("Take this shop back from its current owner?")) return;
    setBusy(storeId);
    const { error: err } = await supabase.rpc("release_store_owner", { p_store: storeId });
    setBusy(null);
    if (err) setError(err.message);
    else window.location.reload();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ocean-800/60 py-16 text-center">
        <Store className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
        <p className="text-sm text-ocean-400">
          {view === "pending" ? "No claims waiting." : `Nothing ${view} yet.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-xl border border-coral-500/40 bg-coral-500/10 p-3 text-sm text-coral-200">{error}</p>}

      {rows.map((c) => (
        <div key={c.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/stores/${c.store_slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 font-medium text-white hover:underline"
              >
                {c.store_name}
                <ExternalLink className="h-3.5 w-3.5 text-ocean-500" />
              </Link>
              <p className="text-sm text-ocean-400">
                {[c.store_city, c.store_state].filter(Boolean).join(", ")}
                {c.already_owned && <span className="text-amber-300"> · already has an owner</span>}
              </p>
            </div>
            <p className="text-xs text-ocean-500">{when(c.created_at)}</p>
          </div>

          <div className="mt-3 rounded-xl border border-ocean-800/60 bg-ocean-950/50 p-3">
            <p className="text-sm text-ocean-200">
              {c.username ? (
                <Link href={`/u/${c.username}`} target="_blank" className="hover:underline">
                  {c.user_name}
                </Link>
              ) : (
                c.user_name
              )}
            </p>
            {c.contact_email && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ocean-400">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${c.contact_email}`} className="hover:underline">
                  {c.contact_email}
                </a>
              </p>
            )}
            {c.proof && <p className="mt-2 whitespace-pre-wrap text-sm text-ocean-300">{c.proof}</p>}
          </div>

          {c.status === "pending" ? (
            <>
              <input
                value={notes[c.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                placeholder="Note to them (sent if you turn it down)"
                className="mt-3 w-full rounded-xl border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white placeholder-ocean-600 outline-none focus:border-ocean-500"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => decide(c.id, true)}
                  disabled={busy === c.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide(c.id, false)}
                  disabled={busy === c.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-ocean-200 transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Turn down
                </button>
                {c.already_owned && (
                  <button
                    type="button"
                    onClick={() => release(c.store_id)}
                    disabled={busy === c.store_id}
                    className="ml-auto text-sm text-ocean-500 hover:text-coral-300 disabled:opacity-50"
                  >
                    Remove current owner
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-ocean-500">
              {c.status === "approved" ? "Approved" : "Turned down"} {when(c.reviewed_at)}
              {c.review_note && ` · ${c.review_note}`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
