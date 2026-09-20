"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Block or unblock someone. Blocking is private: they aren't told.
 * Neither of you sees the other's posts or comments, and neither can
 * message, comment on, like or follow the other.
 */
export default function BlockButton({
  userId,
  name,
  initialBlocked = false,
  className,
  onBlocked,
}: {
  userId: string;
  name: string;
  initialBlocked?: boolean;
  className?: string;
  onBlocked?: () => void;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    if (!blocked) {
      const ok = window.confirm(
        `Block ${name}?\n\nYou won't see each other's posts or comments, and they can't message you, comment on your posts or follow you. They won't be told.`
      );
      if (!ok) return;
    }
    setBusy(true);
    const { error: err } = await supabase.rpc(blocked ? "unblock_user" : "block_user", { p_user: userId });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    const now = !blocked;
    setBlocked(now);
    if (now && onBlocked) onBlocked();
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={
          className ??
          "inline-flex items-center gap-1.5 text-xs text-ocean-500 transition-colors hover:text-coral-300 disabled:opacity-50"
        }
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
        {blocked ? `Unblock ${name}` : `Block ${name}`}
      </button>
      {error && <span className="mt-1 text-xs text-coral-300">{error}</span>}
    </span>
  );
}
