"use client";

/**
 * Sending someone to Log in without losing their place.
 *
 * Every trip to /login carries ?next= with the page they were on, and
 * anything they'd typed (a reply, a new thread) is parked in this tab's
 * sessionStorage so it's waiting in the box when they come back.
 */

const DRAFT_PREFIX = "ua-draft:";

/** /login?next=<this page>, or /register?next=… */
export function authUrlForHere(path: "/login" | "/register" = "/login"): string {
  if (typeof window === "undefined") return path;
  const here = window.location.pathname + window.location.search + window.location.hash;
  if (here.startsWith("/login") || here.startsWith("/register")) return path;
  return `${path}?next=${encodeURIComponent(here)}`;
}

/** Save a draft (if any), then go to Log in and come back here after. */
export function goToLogin(draft?: { key: string; value: unknown }): void {
  if (draft) saveDraft(draft.key, draft.value);
  window.location.href = authUrlForHere("/login");
}

export function saveDraft(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage blocked: they'll just have to type it again.
  }
}

/** The saved draft, removed as it's read so it only fills the box once. */
export function takeDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_PREFIX + key);
    if (raw === null) return null;
    sessionStorage.removeItem(DRAFT_PREFIX + key);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
