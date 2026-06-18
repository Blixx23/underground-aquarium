"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteClubButton({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    const typed = prompt(
      `This permanently deletes "${clubName}" along with its members, invites, and dues history. This cannot be undone.\n\nType the club name to confirm:`
    );
    if (typed === null) return;
    if (typed.trim() !== clubName) {
      setError("Name didn't match — nothing was deleted.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc("delete_club", {
        p_club: clubId,
      });
      if (rpcErr) throw rpcErr;
      router.push("/clubs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the club.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-coral-500/30 bg-coral-500/5 p-5">
      <h2 className="text-coral-200 font-medium mb-1">Danger zone</h2>
      <p className="text-sm text-ocean-400 mb-3">
        Deleting the club removes all members, invites, and dues records. This
        can&apos;t be undone.
      </p>
      {error && <p className="text-sm text-coral-300 mb-2">{error}</p>}
      <button
        onClick={del}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-coral-500/50 px-4 py-2 text-sm font-medium text-coral-200 hover:bg-coral-500/10 transition-colors disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        Delete club
      </button>
    </div>
  );
}
