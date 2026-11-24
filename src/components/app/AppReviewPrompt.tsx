"use client";

import { useEffect } from "react";
import { isInApp } from "@/lib/app/nativeSignIn";

/**
 * "Enjoying Underground Aquarium?" rating prompt, inside the app only.
 *
 * Asks Apple (or Google) to show its own star-rating box once someone has
 * clearly settled in: at least 5 app opens spread over 3+ days, and never
 * sooner than 120 days after the last ask. It waits 20 seconds into a visit
 * so it never interrupts someone the moment they open the app.
 * Apple decides whether the box actually appears (max 3 times a year), so
 * this only ever asks politely. Builds without the plugin simply skip it.
 */

const OPENS_KEY = "ua-review-opens";
const FIRST_KEY = "ua-review-first";
const ASKED_KEY = "ua-review-asked";
const SESSION_KEY = "ua-review-counted";
const DAY = 24 * 60 * 60 * 1000;

type ReviewPlugin = { requestReview(): Promise<void> };

function reviewPlugin(): ReviewPlugin | null {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  const p = cap?.Plugins?.InAppReview as ReviewPlugin | undefined;
  return p?.requestReview ? p : null;
}

function num(key: string): number {
  try {
    return Number(localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}

function set(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

export default function AppReviewPrompt() {
  useEffect(() => {
    if (!isInApp()) return;
    const now = Date.now();

    // Count one open per app session, not per page.
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, "1");
        set(OPENS_KEY, num(OPENS_KEY) + 1);
        if (!num(FIRST_KEY)) set(FIRST_KEY, now);
      }
    } catch {}

    const ready =
      num(OPENS_KEY) >= 5 &&
      now - num(FIRST_KEY) >= 3 * DAY &&
      now - num(ASKED_KEY) >= 120 * DAY;
    if (!ready) return;

    const t = window.setTimeout(() => {
      const plugin = reviewPlugin();
      if (!plugin) return;
      set(ASKED_KEY, Date.now());
      plugin.requestReview().catch(() => {});
    }, 20000);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
