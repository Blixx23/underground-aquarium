"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps an open conversation current without reloading:
 *  - a new message from either side shows up right away (Supabase live updates),
 *  - "Seen" appears when the other person opens it,
 *  - the page opens at the newest message and follows new ones down.
 * A slow check every 30 seconds covers phones that drop the live connection.
 */
export default function LiveThread({
  threadId,
  messageCount,
}: {
  threadId: string;
  /** Changes when a new message renders, which is our cue to scroll down. */
  messageCount: number;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const first = useRef(true);

  // Keep the newest message and the reply box on screen: when the chat opens and
  // whenever a message arrives. Next.js resets the scroll just after a page opens
  // and photos grow the page as they load, so we try a few times over about two
  // seconds, and stop as soon as the member scrolls on their own.
  useEffect(() => {
    const opening = first.current;
    first.current = false;
    const toEnd = (smooth: boolean) =>
      document.getElementById("thread-end")?.scrollIntoView({ behavior: smooth ? "smooth" : "instant", block: "end" });

    let userMoved = false;
    const stop = () => {
      userMoved = true;
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    const timers = [0, 150, 500, 1000, 1800].map((ms, i) =>
      setTimeout(() => {
        if (!userMoved) toEnd(!opening && i === 0);
      }, ms)
    );
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
    };
  }, [messageCount]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Several events can land together (a message plus the read stamp); refresh once.
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase
      .channel(`thread:${threadId}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listing_messages", filter: `thread_id=eq.${threadId}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "listing_threads", filter: `id=eq.${threadId}` },
        refresh
      )
      .subscribe();

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [supabase, threadId, router]);

  return null;
}
