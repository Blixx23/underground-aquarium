"use client";

import { useEffect } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { createClient } from "@/lib/supabase/client";

const FLAG = "ua_no_track";

function optedOut(): boolean {
  try {
    return window.localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * Vercel Web Analytics, minus our own visits.
 *
 * A browser stops counting when:
 *  - an admin signs in on it (checked once per visit), or
 *  - someone opens any page with ?notrack=1 (use this on your phone, or a
 *    family member's). ?notrack=0 turns counting back on.
 */
export default function SiteAnalytics() {
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("notrack");
      if (p === "1") window.localStorage.setItem(FLAG, "1");
      if (p === "0") window.localStorage.removeItem(FLAG);
    } catch {
      /* storage blocked: nothing to remember */
    }
    if (optedOut()) return;

    let checked = false;
    try {
      checked = window.sessionStorage.getItem("ua_admin_checked") === "1";
    } catch {
      /* ignore */
    }
    if (checked) return;

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
      try {
        window.sessionStorage.setItem("ua_admin_checked", "1");
        if (me?.is_admin) window.localStorage.setItem(FLAG, "1");
      } catch {
        /* ignore */
      }
    });
  }, []);

  return <Analytics beforeSend={(event: BeforeSendEvent) => (optedOut() ? null : event)} />;
}
