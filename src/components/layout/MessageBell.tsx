"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MESSAGING_ENABLED } from "@/lib/config";

type ThreadRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
};

/**
 * Chat bubble with an unread count, sitting next to the notification bell.
 * A thread counts as unread when its newest message landed after the moment
 * this viewer last opened it.
 */
export default function MessageBell({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [signedIn, setSignedIn] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!MESSAGING_ENABLED) return;

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active) return;

        if (!user) {
          setSignedIn(false);
          setCount(0);
          return;
        }
        setSignedIn(true);

        // Row level security already limits this to the viewer's own threads.
        const { data } = await supabase
          .from("listing_threads")
          .select(
            "id, buyer_id, seller_id, last_message_at, buyer_last_read_at, seller_last_read_at"
          )
          .order("last_message_at", { ascending: false })
          .limit(200);
        if (!active) return;

        const threads = (data ?? []) as unknown as ThreadRow[];
        const unread = threads.filter((t) => {
          const lastRead =
            t.buyer_id === user.id
              ? t.buyer_last_read_at
              : t.seller_last_read_at;
          if (!lastRead) return true;
          return (
            new Date(t.last_message_at).getTime() >
            new Date(lastRead).getTime()
          );
        }).length;

        setCount(unread);

        // A new message anywhere bumps the badge without a refresh.
        if (!channel) {
          channel = supabase
            .channel(`listing-messages:${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "listing_messages",
              },
              (payload) => {
                const m = payload.new as { sender_id?: string };
                // Don't badge someone for their own reply.
                if (m.sender_id === user.id) return;
                load();
              }
            )
            .subscribe();
        }
      } catch {
        // Transient network or auth blip. Try again on the next tick.
      }
    }

    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const id = setInterval(load, 60000);

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      load();
    });

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (!MESSAGING_ENABLED || !signedIn) return null;

  return (
    <Link
      href="/messages"
      onClick={onNavigate}
      aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
      className="relative p-2 text-ocean-300 hover:text-white transition-colors"
    >
      <MessageCircle className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral-500 text-white text-[11px] font-medium flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
