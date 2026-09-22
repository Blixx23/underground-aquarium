"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FixActions({ id }: { id: string }) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(status: "done" | "dismissed") {
    setBusy(true);
    await supabase
      .from("store_edit_suggestions")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", id);
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
    </div>
  );
}
