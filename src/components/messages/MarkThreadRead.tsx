"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Stamps the viewer's read timestamp on a thread when they open it.
 * Row level security only lets the two participants touch the row, so this
 * can safely run from the browser instead of costing an API round trip.
 */
export default function MarkThreadRead({
  threadId,
  role,
}: {
  threadId: string;
  role: "buyer" | "seller";
}) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const field =
      role === "buyer" ? "buyer_last_read_at" : "seller_last_read_at";
    supabase
      .from("listing_threads")
      .update({ [field]: new Date().toISOString() })
      .eq("id", threadId)
      .then(() => {
        // Nothing to do — the badge updates on the next page load.
      });
  }, [supabase, threadId, role]);

  return null;
}
