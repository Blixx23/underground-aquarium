"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Module-level guard: ping at most once per page-session, regardless of remounts.
let pinged = false;

export default function DailyHeartbeat() {
  useEffect(() => {
    if (pinged) return;
    pinged = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      fetch("/api/bubbles/heartbeat", { method: "POST" }).catch(() => {});
    });
  }, []);
  return null;
}
