"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hides a finished conversation from the inbox. Only for the person who taps it;
 * it comes back on its own if a newer message arrives.
 */
export default function ArchiveThreadButton({
  threadId,
  role,
  archived,
}: {
  threadId: string;
  role: "buyer" | "seller";
  archived: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const field = role === "buyer" ? "buyer_archived_at" : "seller_archived_at";
    const { error } = await supabase
      .from("listing_threads")
      .update({ [field]: archived ? null : new Date().toISOString() })
      .eq("id", threadId);
    setBusy(false);
    if (error) return;
    if (archived) router.refresh();
    else router.push("/messages");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs text-ocean-500 transition-colors hover:text-white disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : archived ? (
        <ArchiveRestore className="h-3.5 w-3.5" />
      ) : (
        <Archive className="h-3.5 w-3.5" />
      )}
      {archived ? "Move back to inbox" : "Archive conversation"}
    </button>
  );
}
