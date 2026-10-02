"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";

/**
 * On Admin > All shops: move a business that says it's wholesale only
 * onto the Wholesale list. Asks once, inline, before doing it.
 */
export default function MoveToWholesale({ storeId, name }: { storeId: string; name: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/wholesale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, action: "move" }),
    });
    const r = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || r.error) return setError(r.error ?? "Couldn't move it.");
    setAsking(false);
    router.refresh();
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        title="They told you they're wholesale only"
        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 px-3.5 py-2 text-sm text-violet-200 hover:bg-violet-400/10"
      >
        <Warehouse className="h-4 w-4" /> Wholesale
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-violet-400/40 bg-violet-400/10 px-3 py-2 text-sm">
      <p className="text-violet-100">
        Move <span className="font-semibold">{name}</span> to the Wholesale list? It comes off Shops and out of the shop
        emails. No email goes to them.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void move()}
          disabled={busy}
          className="rounded-lg bg-violet-500 px-3 py-1 font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {busy ? "Moving…" : "Move to wholesale"}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          disabled={busy}
          className="rounded-lg border border-white/15 px-3 py-1 text-ocean-200 hover:text-white"
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
