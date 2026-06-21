"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Fish } from "lucide-react";

type QueueSuggestion = {
  id: string;
  common_name: string;
  scientific_name: string | null;
  note: string | null;
  created_at: string | null;
  suggester_username: string | null;
  suggester_name: string | null;
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

export default function AdminSpeciesList({
  initialSuggestions,
}: {
  initialSuggestions: QueueSuggestion[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<QueueSuggestion[]>(initialSuggestions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "add" | "dismiss") {
    if (action === "dismiss" && !confirm("Dismiss this suggestion?")) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/species-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setItems((prev) => prev.filter((s) => s.id !== id));
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
        No species suggestions waiting for review.
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
      {items.map((s) => {
        const who = s.suggester_username
          ? `@${s.suggester_username}`
          : s.suggester_name || "a member";
        const when = whenLabel(s.created_at);
        const busy = busyId === s.id;
        return (
          <div
            key={s.id}
            className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-ocean-800/50 shrink-0 flex items-center justify-center">
                <Fish className="w-5 h-5 text-ocean-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-medium">{s.common_name}</h3>
                {s.scientific_name && (
                  <p className="text-sm italic text-ocean-300">
                    {s.scientific_name}
                  </p>
                )}
                <p className="text-xs text-ocean-500 mt-0.5">
                  Suggested by {who}
                  {when ? ` · ${when}` : ""}
                </p>
                {s.note && (
                  <p className="text-sm text-ocean-300 mt-2 whitespace-pre-line break-words">
                    {s.note}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => act(s.id, "add")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Added
              </button>
              <button
                onClick={() => act(s.id, "dismiss")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-300 hover:text-white hover:border-coral-500/50 transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" /> Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
