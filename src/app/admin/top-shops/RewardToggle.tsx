"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Check } from "lucide-react";

/** Tick a winner's reward as sent, and keep a short note (what was sent, tracking). */
export default function RewardToggle({
  quarter,
  storeId,
  sentAt,
  note,
}: {
  quarter: string;
  storeId: string;
  sentAt: string | null;
  note: string | null;
}) {
  const router = useRouter();
  const [sent, setSent] = useState(Boolean(sentAt));
  const [text, setText] = useState(note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { sent?: boolean; note?: string }) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/top-shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quarter, storeId, ...next }),
    });
    const r = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || r.error) return setError(r.error ?? "Couldn't save.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5 sm:items-end">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const next = !sent;
          setSent(next);
          void save({ sent: next });
        }}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm disabled:opacity-50 ${
          sent
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-amber-300/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
        }`}
      >
        {sent ? <Check className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
        {sent ? "Reward sent" : "Mark reward sent"}
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== (note ?? "")) void save({ note: text });
        }}
        placeholder="Note: what you sent, tracking…"
        className="w-full rounded-lg border border-ocean-800 bg-ocean-950/60 px-2.5 py-1.5 text-xs text-white placeholder:text-ocean-600 sm:w-56"
      />
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
