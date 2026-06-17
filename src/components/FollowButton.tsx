"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const uid = data.user?.id ?? null;
      setMeId(uid);
      if (uid && uid !== targetUserId) {
        const { data: row } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", uid)
          .eq("following_id", targetUserId)
          .maybeSingle();
        if (active) setIsFollowing(!!row);
      }
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [supabase, targetUserId]);

  // Never show a Follow button on your own profile
  if (meId && meId === targetUserId) return null;

  async function toggle() {
    if (busy) return;
    if (!meId) {
      router.push("/login");
      return;
    }
    setBusy(true);
    const next = !isFollowing;
    setIsFollowing(next); // optimistic
    try {
      if (next) {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: meId, following_id: targetUserId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", meId)
          .eq("following_id", targetUserId);
        if (error) throw error;
      }
    } catch {
      setIsFollowing(!next); // revert if it failed
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || !loaded}
      className={
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 " +
        (isFollowing
          ? "border border-white/10 text-ocean-200 hover:text-white hover:border-white/20"
          : "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25")
      }
    >
      {isFollowing ? (
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
  );
}