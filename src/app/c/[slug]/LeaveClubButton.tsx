"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SOCIETY_PATH } from "@/lib/config";

export default function LeaveClubButton({
  clubId,
  clubName,
  label = "Leave the Society",
  withdrawing = false,
}: {
  clubId: string;
  clubName: string;
  label?: string;
  /** True for a pending applicant pulling their application. */
  withdrawing?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    // Membership is open to anyone, so leaving (or withdrawing) is never
    // permanent: they can apply again from the Society page any time.
    const question = withdrawing
      ? `Withdraw your application to ${clubName}? You can apply again any time.`
      : `Leave ${clubName}? You can apply to join again any time.`;
    if (!confirm(question)) return;
    setError(null);
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc("leave_club", {
        p_club: clubId,
      });
      if (rpcErr) throw rpcErr;
      router.push(SOCIETY_PATH);
      router.refresh();
    } catch (err) {
      // Supabase errors are plain objects, not Error instances.
      const e = err as { message?: string; details?: string } | null;
      setError(
        e?.message ||
          e?.details ||
          (withdrawing ? "Couldn't withdraw your application." : "Couldn't leave the Society.")
      );
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
