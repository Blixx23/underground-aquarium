"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const REF_KEY = "ua_ref";

// Once per page-session, however often this remounts.
let ran = false;

/**
 * Two quiet jobs that run on every page:
 *
 *  1. Remember a referral. Anyone arriving on a link with ?ref=handle has
 *     it saved, and once they're signed in (usually straight after signing
 *     up) it's claimed. The database only accepts it for a new account.
 *  2. Check for newly earned trophies for whoever's signed in. The
 *     database throttles this to once a minute.
 */
export default function TrophySync() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Za-z0-9_]{2,40}$/.test(ref)) localStorage.setItem(REF_KEY, ref);
    } catch {
      /* storage blocked: referral just isn't recorded */
    }

    if (ran) return;
    ran = true;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      let ref: string | null = null;
      try {
        ref = localStorage.getItem(REF_KEY);
      } catch {
        ref = null;
      }
      if (ref) {
        await supabase.rpc("claim_referral", { p_username: ref });
        try {
          localStorage.removeItem(REF_KEY);
        } catch {
          /* ignore */
        }
      }

      await supabase.rpc("sync_my_trophies");
    });
  }, []);

  return null;
}
