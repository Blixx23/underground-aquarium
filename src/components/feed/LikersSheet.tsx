"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";
import SocietySeal from "@/components/society/SocietySeal";
import type { FeedKind, FeedLiker } from "@/lib/feed";

/** "Who liked this": a bottom sheet on phones, a centered card on desktop. */
export default function LikersSheet({
  kind,
  id,
  onClose,
}: {
  kind: FeedKind;
  id: string;
  onClose: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<FeedLiker[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.rpc("get_feed_likers", { p_kind: kind, p_id: id }).then(({ data, error: err }) => {
      if (!alive) return;
      if (err) setError("Couldn't load likes.");
      setRows((data as FeedLiker[] | null) ?? []);
    });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      alive = false;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [supabase, kind, id, onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Likes"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[75dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-ocean-700/70 bg-[#06182b] font-sans shadow-2xl shadow-black/80 sm:max-w-sm sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="inline-flex items-center gap-2 font-semibold text-white">
            <Heart className="h-4 w-4 fill-coral-400 text-coral-400" />
            Likes{rows && rows.length > 0 ? ` (${rows.length})` : ""}
          </p>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {rows === null ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{error ?? "No likes yet."}</p>
          ) : (
            rows.map((r) => (
              <Link
                key={r.user_id}
                href={r.username ? `/u/${r.username}` : "#"}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/5"
              >
                <Avatar name={r.name} src={r.avatar} society={r.society} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[15px] font-medium text-white">
                    <span className="truncate">{r.name}</span>
                    {r.society && <SocietySeal size={14} className="h-3.5 w-3.5 shrink-0" />}
                  </span>
                  {r.username && <span className="block truncate text-xs text-slate-500">@{r.username}</span>}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
