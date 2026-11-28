"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** The owner's one-tap "it's gone" on their own listing page. */
export default function MarkSoldButton({
  listingId,
  isWanted,
  compact = false,
}: {
  listingId: string;
  isWanted: boolean;
  /** Small pill for tight spots like the message thread header. */
  compact?: boolean;
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

  if (compact) {
    return (
      <span className="inline-flex flex-col">
        <button
          type="button"
          onClick={markSold}
          disabled={busy}
          className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-medium text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          {label}
        </button>
        {error && <span className="mt-1 text-xs text-coral-300">{error}</span>}
      </span>
    );
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
