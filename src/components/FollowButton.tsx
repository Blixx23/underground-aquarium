"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [following, setFollowing] = useState(initialFollowing);
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
    const next = !following;
    setFollowing(next);
    try {
      if (next) {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: userId, following_id: targetUserId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", targetUserId);
        if (error) throw error;
      }
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={busy}
        className={
          "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 " +
          (following
            ? "border border-white/10 text-ocean-200 hover:text-white hover:border-white/20"
            : "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25")
        }
      >
        {following ? (
          <>
            <UserCheck className="w-4 h-4" />
            Following
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Follow
          </>
        )}
      </button>
      {needAuth && (
        <span className="text-xs text-ocean-400">
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>{" "}
          to follow
        </span>
      )}
    </div>
  );
}