"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fish } from "lucide-react";

/** Set when someone taps "Look around first"; cleared whenever they're signed in (AppSession). */
export const WELCOME_SEEN_KEY = "ua-welcome-seen";

/**
 * The app's welcome screen: shown the first time the app opens, and again
 * after signing out. Covers the whole screen (header and tab bar included)
 * so it feels like the app's own first page.
 */
export default function StartScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(WELCOME_SEEN_KEY) === "1";
    } catch {
      /* storage blocked: just show the welcome */
    }
    if (seen) router.replace("/");
    else setReady(true);
  }, [router]);

  function lookAround() {
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      /* fine */
    }
    router.replace("/");
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#020b18]">
      {ready && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(14,74,118,0.55),transparent_65%)]"
          />
          <main className="relative flex flex-1 flex-col items-center justify-center px-8 pt-[env(safe-area-inset-top)] text-center">
            <span className="relative mb-7 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-ocean-600/30 animate-glow-pulse" />
              <Fish className="relative h-11 w-11 text-ocean-300" strokeWidth={1.8} />
            </span>
            <h1 className="font-display text-3xl leading-tight tracking-wide text-white">
              Underground
              <br />
              <span className="text-xl tracking-[0.35em] text-ocean-300">AQUARIUM</span>
            </h1>
            <p className="mt-5 max-w-xs text-[17px] leading-relaxed text-ocean-200">
              Local fish stores, free classifieds, and a community that keeps fish.
            </p>
          </main>

          <div className="relative space-y-3 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Link
              href="/register?next=/feed"
              className="block w-full rounded-2xl bg-emerald-500 py-4 text-center text-[17px] font-semibold text-ocean-950 transition-colors active:bg-emerald-400"
            >
              Create account
            </Link>
            <Link
              href="/login?next=/feed"
              className="block w-full rounded-2xl border border-ocean-600/70 py-4 text-center text-[17px] font-semibold text-white transition-colors active:bg-white/5"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={lookAround}
              className="block w-full py-3 text-center text-[15px] text-ocean-300 active:text-white"
            >
              Look around first
            </button>
          </div>
        </>
      )}
    </div>
  );
}
