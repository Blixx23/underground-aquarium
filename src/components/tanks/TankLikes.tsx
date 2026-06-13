"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function TankLikes({
  tankId,
  initialCount,
  initialLiked,
}: {
  tankId: string;
  initialCount: number;
  initialLiked: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
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
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      if (next) {
        const { error } = await supabase
          .from("tank_likes")
          .insert({ tank_id: tankId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tank_likes")
          .delete()
          .eq("tank_id", tankId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    } catch {
      setLiked(!next);
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
        aria-label={liked ? "Unlike" : "Like"}
        className={
          "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 " +
          (liked
            ? "border-pink-500/40 bg-pink-500/10 text-pink-300"
            : "border-white/10 text-ocean-300 hover:text-white hover:border-white/20")
        }
      >
        <Heart
          className={"w-4 h-4 " + (liked ? "fill-pink-400 text-pink-400" : "")}
        />
        {count}
      </button>
      {needAuth && (
        <span className="text-xs text-ocean-400">
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Sign in
          </Link>{" "}
          to like
        </span>
      )}
    </div>
  );
}