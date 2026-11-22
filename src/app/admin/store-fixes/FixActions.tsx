"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FixActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Goes through the server so a correct fix can pay the member who sent it.
  async function set(status: "done" | "dismissed") {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/store-fixes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Couldn't save that.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => set("done")}
        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        Fixed
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => set("dismissed")}
        className="rounded-lg border border-ocean-700 px-3 py-1.5 text-xs text-ocean-300 hover:text-white disabled:opacity-50"
      >
        Dismiss
      </button>
      {error && <p className="self-center text-xs text-coral-300">{error}</p>}
    </div>
  );
}
