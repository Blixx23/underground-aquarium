"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function JoinClubButton({
  clubId,
}: {
  clubId: string;
  clubName?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setError(null);
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc("join_club", {
        p_club: clubId,
      });
      if (rpcErr) throw rpcErr;
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join the club.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {error && <p className="text-sm text-coral-300">{error}</p>}
      <button
        onClick={join}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        Request to join
      </button>
    </div>
  );
}
