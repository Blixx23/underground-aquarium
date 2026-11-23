"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { WELCOME_SEEN_KEY } from "@/app/start/StartScreen";

/**
 * In the app only: while someone is signed in, forget that they once chose
 * "Look around first", so the welcome screen shows again after they sign out.
 * Reads the saved session locally; no network call.
 */
export default function AppSession() {
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!/UAApp/.test(navigator.userAgent) && !cap?.isNativePlatform?.()) return;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) {
          try {
            localStorage.removeItem(WELCOME_SEEN_KEY);
          } catch {
            /* fine */
          }
        }
      })
      .catch(() => {});
  }, []);
  return null;
}
