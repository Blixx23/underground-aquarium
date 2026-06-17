"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={favorited}
        className={
          "inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 " +
          (favorited
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            : "border-white/10 text-ocean-300 hover:text-white hover:border-white/20")
        }
      >
        <Heart className={"w-4 h-4 " + (favorited ? "fill-current" : "")} />
        {favorited ? "Favorited" : "Favorite"}
        {count > 0 && <span className="text-ocean-400 font-normal">· {count}</span>}
      </button>
      {needAuth && (
        <span className="text-xs text-ocean-400">
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>{" "}
          to favorite
        </span>
      )}
    </div>
  );
}