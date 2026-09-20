"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Counts a page view for the shop, once per visit. No personal detail is
 * stored: the database keeps a tally per day so the owner can see how many
 * people looked them up.
 */
export default function StoreTracker({ storeId }: { storeId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    try {
      const key = `ua-store-view-${storeId}`;
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < 30 * 60 * 1000) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* private browsing: count it anyway */
    }
    createClient().rpc("record_store_event", { p_store: storeId, p_kind: "view" });
  }, [storeId]);
  return null;
}
