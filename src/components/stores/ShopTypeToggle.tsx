"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Warehouse } from "lucide-react";

/**
 * Admin only. Is this business a consumer store (in the shop directory,
 * gets shop emails) or a wholesale supplier (on the Wholesale list, out
 * of the directory and every shop email)? No email goes to them either way.
 */
export default function ShopTypeToggle({ storeId, wholesale: initial }: { storeId: string; wholesale: boolean }) {
  const router = useRouter();
  const [wholesale, setWholesale] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function set(next: boolean) {
    if (next === wholesale || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/wholesale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, action: next ? "move" : "return" }),
    });
    const r = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || r.error) return setError(r.error ?? "Couldn't change it.");
    setWholesale(next);
    router.refresh();
  }

  const side = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${on ? "" : "text-ocean-400 hover:text-white"}`;

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        role="radiogroup"
        aria-label="Business type"
        title="Admin only"
        className="inline-flex rounded-xl border border-white/15 bg-ocean-950/60 p-0.5 text-sm"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!wholesale}
          disabled={busy}
          onClick={() => void set(false)}
          className={`${side(!wholesale)} ${!wholesale ? "bg-sky-500/20 text-sky-100" : ""}`}
        >
          <Store className="h-4 w-4" /> Consumer store
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={wholesale}
          disabled={busy}
          onClick={() => void set(true)}
          className={`${side(wholesale)} ${wholesale ? "bg-violet-500/25 text-violet-100" : ""}`}
        >
          <Warehouse className="h-4 w-4" /> Wholesale supply
        </button>
      </div>
      {busy && <span className="text-xs text-ocean-400">Saving…</span>}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
