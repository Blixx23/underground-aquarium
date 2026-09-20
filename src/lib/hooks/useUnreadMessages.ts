"use client";

import { useEffect, useMemo, useState } from "react";
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
 * How many message threads the viewer hasn't opened since their newest
 * message arrived. Shared by the top bar's chat bubble and the phone
 * bottom bar, so the two badges can never disagree. Live: a new message
 * bumps it without a refresh.
 */
export function useUnreadMessages(): { signedIn: boolean; count: number } {
  const supabase = useMemo(() => createClient(), []);
  // The top bar and the bottom bar both use this, and both stay mounted,
  // so each needs its own live channel name.
  const instance = useMemo(() => Math.random().toString(36).slice(2, 8), []);
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
            .channel(`listing-messages:${user.id}:${instance}`)
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

  return { signedIn: MESSAGING_ENABLED && signedIn, count };
}
