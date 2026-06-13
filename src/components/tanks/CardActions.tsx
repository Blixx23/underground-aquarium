"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CardActions({
  tankId,
  initialLikes,
  initialLiked,
  commentCount,
}: {
  tankId: string;
  initialLikes: number;
  initialLiked: boolean;
  commentCount: number;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [count, setCount] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  async function toggleLike() {
    if (busy) return;
    if (!userId) {
      router.push("/login");
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
    <div className="flex items-center gap-3 text-xs shrink-0">
      <button
        type="button"
        onClick={toggleLike}
        disabled={busy}
        aria-label={liked ? "Unlike" : "Like"}
        className={
          "inline-flex items-center gap-1 transition-colors disabled:opacity-50 " +
          (liked ? "text-pink-400" : "text-ocean-400 hover:text-pink-300")
        }
      >
        <Heart className={"w-3.5 h-3.5 " + (liked ? "fill-pink-400" : "")} />
        {count}
      </button>
      <Link
        href={`/tanks/${tankId}#comments`}
        aria-label="View comments"
        className="inline-flex items-center gap-1 text-ocean-400 hover:text-emerald-300 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {commentCount}
      </Link>
    </div>
  );
}