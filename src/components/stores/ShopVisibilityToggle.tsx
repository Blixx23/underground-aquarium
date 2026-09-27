"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

/** Admin-only switch: is this shop listed in the Shops directory? */
export default function ShopVisibilityToggle({ storeId, visible: initial }: { storeId: string; visible: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function flip() {
    const next = !visible;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/shop-visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, visible: next }),
    });
    const r = (await res.json()) as { ok?: boolean; visible?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || r.error) return setError(r.error ?? "Couldn't change it.");
    setVisible(Boolean(r.visible));
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        onClick={() => void flip()}
        disabled={busy}
        title="Admin only"
        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors disabled:opacity-50 ${
          visible
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            : "border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
        }`}
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        {busy ? "Saving…" : visible ? "Shown in Shops" : "Hidden from Shops"}
        <span
          aria-hidden
          className={`relative ml-1 inline-block h-4 w-7 rounded-full transition-colors ${visible ? "bg-emerald-500" : "bg-ocean-700"}`}
        >
          <span
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${visible ? "left-3.5" : "left-0.5"}`}
          />
        </span>
      </button>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
