"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * A heart, the same one the feed uses: grey until you tap it, coral once
 * you have. Favoriting a shop is what puts its updates in your
 * notifications, but the heart says that on its own.
 */
export default function StoreFavoriteButton({
  storeId,
  initialFavorited,
  initialCount,
}: {
  storeId: string;
  initialFavorited: boolean;
  initialCount: number;
}) {
  const [supabase] = useState(() => createClient());
  const [favorited, setFavorited] = useState(initialFavorited);
  const [count, setCount] = useState(initialCount);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needAuth, setNeedAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  async function toggle() {
    if (busy) return;
    if (!userId) {
      setNeedAuth(true);
      return;
    }
    setBusy(true);
    const next = !favorited;
    setFavorited(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      if (next) {
        const { error } = await supabase
          .from("store_favorites")
          .insert({ user_id: userId, fish_store_id: storeId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("fish_store_id", storeId);
        if (error) throw error;
      }
    } catch {
      setFavorited(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={favorited}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50 ${
          favorited ? "text-coral-400" : "text-ocean-400 hover:text-white"
        }`}
      >
        <Heart className={`h-5 w-5 ${favorited ? "fill-current" : ""}`} />
        {count > 0 && <span>{count}</span>}
      </button>
      {needAuth && (
        <span className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-lg border border-white/10 bg-ocean-900 px-3 py-1.5 text-xs text-ocean-300 shadow-lg">
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>{" "}
          to favorite
        </span>
      )}
    </span>
  );
}
