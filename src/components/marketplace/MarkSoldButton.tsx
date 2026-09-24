"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** The owner's one-tap "it's gone" on their own listing page. */
export default function MarkSoldButton({
  listingId,
  isWanted,
}: {
  listingId: string;
  isWanted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = isWanted ? "Mark as found" : "Mark as sold";

  async function markSold() {
    if (!window.confirm(`${label}? It comes off the marketplace, and you can relist it from My Listings.`)) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase.from("listings").update({ status: "sold" }).eq("id", listingId);
    if (e) {
      setError("Couldn't update it. Try again.");
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={markSold}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/90 px-5 py-3 font-medium text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {label}
      </button>
      {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
    </div>
  );
}
