"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Request = {
  id: string;
  display_name: string | null;
  email: string | null;
  account_name?: string | null;
  tier?: string | null;
  phone?: string | null;
  experience?: string | null;
  interests?: string | null;
  note?: string | null;
};

export default function ClubRequests({ requests }: { requests: Request[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const { error: e } = await supabase.rpc("approve_member", {
        p_member: id,
      });
      if (e) throw e;
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't approve.");
      setBusyId(null);
    }
  }

  async function decline(id: string, label: string) {
    if (!confirm(`Decline ${label}'s request to join?`)) return;
    setError(null);
    setBusyId(id);
    try {
      const { error: e } = await supabase
        .from("club_members")
        .delete()
        .eq("id", id);
      if (e) throw e;
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't decline.");
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-700/30 bg-amber-900/10 p-4 mb-8">
      <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-amber-300" /> Join requests (
        {requests.length})
      </p>
      {error && <p className="text-sm text-coral-300 mb-2">{error}</p>}
      <div className="space-y-2">
        {requests.map((r) => {
          const label =
            r.display_name || r.account_name || r.email || "Someone";
          const busy = busyId === r.id;
          return (
            <div key={r.id} className="rounded-lg bg-ocean-900/40 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm text-ocean-100">{label}</span>
                  {r.tier && (
                    <span className="ml-2 text-xs text-ocean-500 capitalize">
                      · {r.tier}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => approve(r.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-700/80 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => decline(r.id, label)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-full border border-ocean-700/60 px-3 py-1 text-xs text-ocean-300 hover:text-coral-300 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-ocean-400">
                {r.email && <p>Email: {r.email}</p>}
                {r.phone && <p>Phone: {r.phone}</p>}
                {r.experience && (
                  <p className="capitalize">Experience: {r.experience}</p>
                )}
                {r.interests && <p>Interests: {r.interests}</p>}
                {r.note && (
                  <p className="text-ocean-300 italic mt-1">
                    &ldquo;{r.note}&rdquo;
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
