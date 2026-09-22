"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Retry a failed row, or cancel one that hasn't gone out yet. */
export default function RowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "retry" | "cancel") {
    setBusy(true);
    await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    setBusy(false);
    router.refresh();
  }

  if (status === "failed") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => act("retry")}
        className="rounded-lg border border-ocean-700 px-2.5 py-1 text-xs text-ocean-200 hover:text-white disabled:opacity-40"
      >
        Try again
      </button>
    );
  }
  if (status === "pending") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => act("cancel")}
        className="rounded-lg border border-ocean-800 px-2.5 py-1 text-xs text-ocean-400 hover:text-white disabled:opacity-40"
      >
        Cancel
      </button>
    );
  }
  return null;
}
