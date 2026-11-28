/**
 * Where to send someone after they sign in. Only paths on this site are
 * allowed, so a crafted ?next= link can't bounce people to another domain.
 */
export function safeNext(raw: string | null | undefined, fallback = "/profile"): string {
  if (!raw) return fallback;
  let v = raw;
  try {
    v = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  if (v.startsWith("/login") || v.startsWith("/register")) return fallback;
  return v;
}

/** Read ?next from the current URL (client components only). */
export function nextFromLocation(fallback = "/profile"): string {
  if (typeof window === "undefined") return fallback;
  const q = new URLSearchParams(window.location.search);
  // Older links used ?redirect=; treat it the same as ?next=.
  return safeNext(q.get("next") ?? q.get("redirect"), fallback);
}

/**
 * The sign-up and password emails link straight to our own domain (so a phone
 * with the app installed opens the app), and pass Supabase's full return
 * address as "next", e.g. https://www.undergroundaquarium.com/auth/callback?next=/claim/x.
 * Boil that down to the page on this site the person was headed to.
 */
export function pagePath(raw: string | null | undefined): string | null {
  if (!raw || raw.startsWith("/")) return raw ?? null;
  try {
    const u = new URL(raw);
    if (!/(^|\.)undergroundaquarium\.com$/.test(u.hostname)) return null;
    if (u.pathname === "/auth/callback" || u.pathname === "/auth/confirm") return u.searchParams.get("next");
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}
