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
  return safeNext(new URLSearchParams(window.location.search).get("next"), fallback);
}
