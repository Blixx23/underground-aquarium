"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { WELCOME_SEEN_KEY } from "@/app/start/StartScreen";

type AppPlugin = {
  addListener(event: "appUrlOpen", cb: (e: { url: string }) => void): Promise<{ remove: () => void }>;
};

/**
 * In the app only, two jobs:
 *  - A tapped undergroundaquarium.com link (a sign-up confirmation email, a
 *    shared ad, a notification email) opens the app instead of Safari. iPhone
 *    hands the link to the app; this loads that page in it. A full page load,
 *    so links like the email confirmation finish signing the person in here.
 *  - While someone is signed in, forget that they once chose
 * "Look around first", so the welcome screen shows again after they sign out.
 * Reads the saved session locally; no network call.
 */
export default function AppSession() {
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!/UAApp/.test(navigator.userAgent) && !cap?.isNativePlatform?.()) return;

    const app = (cap as { Plugins?: Record<string, unknown> } | undefined)?.Plugins?.App as AppPlugin | undefined;
    let listener: { remove: () => void } | undefined;
    app
      ?.addListener("appUrlOpen", ({ url }) => {
        try {
          const u = new URL(url);
          if (!/(^|\.)undergroundaquarium\.com$/.test(u.hostname)) return;
          const target = `${u.pathname}${u.search}${u.hash}`;
          if (target !== `${location.pathname}${location.search}${location.hash}`) location.assign(target);
        } catch {
          /* not a link we handle */
        }
      })
      .then((l) => (listener = l))
      .catch(() => {});

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
    return () => listener?.remove();
  }, []);
  return null;
}
