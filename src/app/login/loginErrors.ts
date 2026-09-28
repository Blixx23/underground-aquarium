/**
 * Friendly wording for the ?error=... value that sends people back to /login.
 *
 * The auth routes (src/app/auth/callback and src/app/auth/confirm) redirect
 * here with a short note when a sign-up confirmation link, a password reset
 * link, or a "Continue with Google" sign-in fails. We never show the raw
 * value from the address bar: anyone can put any text in a link, so we only
 * show wording we wrote ourselves. Unknown values get a generic message.
 */

// Text the auth routes pass today, matched after trimming and lowercasing.
const KNOWN_ERRORS: Record<string, string> = {
  // src/app/auth/confirm/route.ts: a confirmation or password reset link failed.
  "could not confirm email":
    "We couldn't confirm that link. It may have expired or already been used. Log in below, or use \"Forgot your password?\" to get a fresh link.",
  // src/app/auth/callback/route.ts: a confirmation or Google sign-in link failed.
  "that sign-in link didn't work. try logging in.":
    "That sign-in link didn't work. It may have expired or already been used. Please try logging in again.",
  // Codes Supabase itself can attach when a link or Google sign-in fails.
  access_denied:
    "Sign-in was cancelled or not allowed. Please try again.",
  otp_expired:
    "That link has expired. Log in below, or use \"Forgot your password?\" to get a fresh link.",
  server_error:
    "Something went wrong on our side while signing you in. Please try again in a minute.",
};

const GENERIC_ERROR =
  "Something went wrong while signing you in. Please try again, or email support@undergroundaquarium.com if it keeps happening.";

/**
 * Turns the ?error=... value into a message we are happy to show, or null
 * when there is no error in the address at all.
 */
export function friendlyLoginError(raw: string | string[] | undefined): string | null {
  // ?error=a&error=b arrives as an array; the first one is enough.
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.trim()) return null;
  return KNOWN_ERRORS[value.trim().toLowerCase()] ?? GENERIC_ERROR;
}
