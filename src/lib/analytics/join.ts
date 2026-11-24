"use client";

import { track } from "@vercel/analytics";

/**
 * Sign-up tracking. Each join prompt has a short "spot" name (shop, species,
 * classifieds, tank-builder, water-check). Clicking one records
 * "Join prompt clicked" in Vercel Analytics, and finishing sign-up records
 * "Signed up" with the same spot, so the Analytics > Events tab shows which
 * pages actually turn visitors into members.
 */

const KEY = "ua:joinFrom";

/** Link to Create account that comes back to `next` afterwards and remembers the spot. */
export function joinHref(spot: string, next: string): string {
  return `/register?next=${encodeURIComponent(next)}&from=${encodeURIComponent(spot)}`;
}

export function loginHref(spot: string, next: string): string {
  return `/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(spot)}`;
}

export function trackJoinClick(spot: string) {
  try {
    window.sessionStorage.setItem(KEY, spot);
  } catch {
    /* storage blocked */
  }
  track("Join prompt clicked", { spot });
}

/** Where this visitor's sign-up started: ?from= on the page, else the last prompt they clicked. */
export function joinSource(): string {
  try {
    const q = new URLSearchParams(window.location.search).get("from");
    if (q) return q.slice(0, 40);
    return window.sessionStorage.getItem(KEY) ?? "direct";
  } catch {
    return "direct";
  }
}

/** Call once a sign-up goes through (form submitted, or Google/Apple started). */
export function trackSignedUp(method: "email" | "google" | "apple") {
  track("Signed up", { from: joinSource(), method });
}
