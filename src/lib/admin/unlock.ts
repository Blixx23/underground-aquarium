/**
 * The admin area's second password. Being signed in as an admin isn't enough
 * on its own: /admin and /api/admin also need this unlock, so a stolen Google
 * or email login can't reach the admin tools.
 *
 * Unlocking sets a signed cookie tied to the admin's account that lasts
 * ADMIN_UNLOCK_HOURS. The key includes the password itself, so changing
 * ADMIN_PASSWORD in Vercel locks every open session at once.
 *
 * Uses Web Crypto so it runs in the request proxy as well as in routes.
 */

export const ADMIN_COOKIE = "ua_admin_unlock";
export const ADMIN_UNLOCK_HOURS = 12;

/** Until ADMIN_PASSWORD is set in Vercel the gate stays off, so a deploy can't lock Chris out. */
export function adminGateEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = `${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}|${process.env.ADMIN_PASSWORD ?? ""}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares without leaking where the strings differ. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeUnlockToken(userId: string): Promise<{ value: string; maxAge: number }> {
  const maxAge = ADMIN_UNLOCK_HOURS * 60 * 60;
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  const body = `${userId}.${exp}`;
  return { value: `${body}.${await hmac(body)}`, maxAge };
}

export async function validUnlockToken(token: string | undefined, userId: string): Promise<boolean> {
  if (!token) return false;
  const [uid, exp, sig] = token.split(".");
  if (!uid || !exp || !sig || uid !== userId) return false;
  if (!(Number(exp) > Math.floor(Date.now() / 1000))) return false;
  return sameString(sig, await hmac(`${uid}.${exp}`));
}

/** Checks a typed password against ADMIN_PASSWORD. Hashing first keeps the comparison length-safe. */
export async function passwordMatches(typed: string): Promise<boolean> {
  const want = process.env.ADMIN_PASSWORD;
  if (!want) return false;
  const h = async (s: string) =>
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))), (b) => b.toString(16).padStart(2, "0")).join("");
  return sameString(await h(typed), await h(want));
}
