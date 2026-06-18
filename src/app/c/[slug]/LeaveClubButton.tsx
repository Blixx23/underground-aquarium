"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LeaveClubButton({
  clubId,
  clubName,
  label = "Leave this club",
}: {
  clubId: string;
  clubName: string;
  label?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    if (!confirm(`Leave ${clubName}? You can re-join later if you're invited again.`))
      return;
    setError(null);
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc("leave_club", {
        p_club: clubId,
      });
      if (rpcErr) throw rpcErr;
      router.push("/clubs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't leave the club.");
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-coral-300 mb-2">{error}</p>}
      <button
        onClick={leave}
        disabled={busy}
        className="inline-flex items-center gap-2 text-sm text-ocean-500 hover:text-coral-300 transition-colors disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        {label}
      </button>
    </div>
  );
}
