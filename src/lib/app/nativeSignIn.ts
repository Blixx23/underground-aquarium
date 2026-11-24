"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Sign-in inside the iPhone app.
 *
 * The app shows the site in a web view, and Google refuses to sign anyone in
 * from inside a web view. So in the app:
 *  - Google opens Apple's secure sign-in sheet (the one banking apps use).
 *    Google allows that. The sheet closes itself when Google sends the
 *    person back, and the app finishes signing in on /auth/callback.
 *  - Apple uses the native Face ID / Apple Account sheet, then hands the
 *    token to Supabase.
 * Both go through the app's own "AppAuth" plugin (ios/App/App/AppDelegate.swift).
 * On the website none of this runs; the buttons work the normal way.
 */

const APP_SCHEME = "com.undergroundaquarium.app";
const APP_CALLBACK = `${APP_SCHEME}://auth-callback`;

type AppAuthPlugin = {
  webSignIn(opts: { url: string; callbackScheme: string }): Promise<{ url: string }>;
  appleSignIn?(opts: { nonce: string }): Promise<{ identityToken: string; givenName?: string; familyName?: string }>;
};

type CapWindow = {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    registerPlugin?: (name: string) => unknown;
    Plugins?: Record<string, unknown>;
  };
};

/** True inside the iPhone app. */
export function isInApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as CapWindow).Capacitor;
  return /UAApp/.test(navigator.userAgent) || Boolean(cap?.isNativePlatform?.());
}

/** The app's sign-in plugin, or null on the website / an old app build without it. */
function appAuth(): AppAuthPlugin | null {
  const cap = (window as unknown as CapWindow).Capacitor;
  if (!cap) return null;
  const fromList = cap.Plugins?.AppAuth as AppAuthPlugin | undefined;
  if (fromList?.webSignIn) return fromList;
  const registered = cap.registerPlugin?.("AppAuth") as AppAuthPlugin | undefined;
  return registered ?? null;
}

/** Whether this app build can do the in-app sign-in (newer builds only). */
export function canSignInNatively(): boolean {
  return isInApp() && appAuth() !== null;
}

/** The person closed the sheet. Not an error worth showing. */
export function isCanceled(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "CANCELED" || /cancel/i.test(e?.message ?? "");
}

function finish(next: string, code?: string | null) {
  const q = new URLSearchParams({ next });
  if (code) q.set("code", code);
  window.location.href = `/auth/callback?${q.toString()}`;
}

/** Google (or any web provider) through the secure sign-in sheet. */
export async function appWebSignIn(provider: "google" | "apple", next: string): Promise<void> {
  const plugin = appAuth();
  if (!plugin) throw new Error("Update the app to sign in with this option.");
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: APP_CALLBACK, skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw new Error(error?.message ?? "Couldn't start sign-in.");

  const { url } = await plugin.webSignIn({ url: data.url, callbackScheme: APP_SCHEME });
  const back = new URL(url);
  // Supabase puts the result in the query, or in the #fragment on errors.
  const params = new URLSearchParams(back.search || back.hash.replace(/^#/, ""));
  const code = params.get("code");
  if (!code) {
    const why = params.get("error_description") ?? params.get("error") ?? "";
    if (/banned/i.test(why)) {
      window.location.href = "/account-suspended";
      return;
    }
    throw new Error(why || "Sign-in didn't finish. Try again.");
  }
  finish(next, code);
}

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** "ios", "android" or "web". */
export function appPlatform(): string {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as CapWindow).Capacitor;
  return cap?.getPlatform?.() ?? (/Android/i.test(navigator.userAgent) ? "android" : "ios");
}

/** Sign in with Apple: the native sheet on iPhone, Apple's web page on Android. */
export async function appAppleSignIn(next: string): Promise<void> {
  // Android has no native Apple sign-in; Apple's own page in a Custom Tab works.
  if (appPlatform() === "android") return appWebSignIn("apple", next);
  const plugin = appAuth();
  if (!plugin) throw new Error("Update the app to sign in with Apple.");
  // Apple gets the hashed nonce, Supabase the raw one, so a stolen token can't be replayed.
  const nonce = randomNonce();
  if (!plugin.appleSignIn) throw new Error("Update the app to sign in with Apple.");
  const { identityToken, givenName, familyName } = await plugin.appleSignIn({ nonce: await sha256Hex(nonce) });
  const supabase = createClient();
  const { data: signedIn, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce,
  });
  if (error) {
    if (/banned/i.test(`${error.code ?? ""} ${error.message}`)) {
      window.location.href = "/account-suspended";
      return;
    }
    throw new Error(error.message);
  }
  // Apple shares the person's name only the very first time, and not in the
  // token, so save it now for a new account that has none yet.
  const fullName = [givenName, familyName].filter(Boolean).join(" ").trim();
  const uid = signedIn?.user?.id;
  if (fullName && uid) {
    await supabase.auth.updateUser({ data: { full_name: fullName } }).catch(() => {});
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", uid).is("full_name", null);
  }
  // Already signed in; the callback runs the same checks as every other
  // sign-in (new account picks a username, suspended, pending deletion).
  finish(next);
}
