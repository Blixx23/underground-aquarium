"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { appPlatform, isInApp } from "@/lib/app/nativeSignIn";

/**
 * Push notifications, inside the iPhone app only.
 *
 *  - Signed in and never asked: after a few seconds a small card offers to
 *    turn notifications on. iPhone's own "Allow notifications?" box only
 *    shows when they tap Turn on, so the one-time system question is never
 *    wasted on someone who isn't ready. "Not now" hides the card for two weeks.
 *  - Already allowed: registers quietly on every launch, so the token stays
 *    current.
 *  - Tapping a notification opens the page it's about.
 *  - Signing out removes this phone, so it stops getting that member's
 *    notifications.
 * Uses Capacitor's PushNotifications plugin, which only newer app builds
 * have; older builds simply don't show the card.
 */

const TOKEN_KEY = "ua-push-token";
const ASKED_KEY = "ua-push-asked";
const ASK_AGAIN_MS = 14 * 24 * 60 * 60 * 1000;

type PermissionState = "granted" | "denied" | "prompt" | "prompt-with-rationale";
type Listener = { remove: () => void };
type PushPlugin = {
  checkPermissions(): Promise<{ receive: PermissionState }>;
  requestPermissions(): Promise<{ receive: PermissionState }>;
  register(): Promise<void>;
  addListener(event: "registration", cb: (t: { value: string }) => void): Promise<Listener>;
  addListener(event: "registrationError", cb: (e: { error: string }) => void): Promise<Listener>;
  addListener(
    event: "pushNotificationActionPerformed",
    cb: (a: { notification: { data?: { link?: string } } }) => void
  ): Promise<Listener>;
};

function pushPlugin(): PushPlugin | null {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  const p = cap?.Plugins?.PushNotifications as PushPlugin | undefined;
  return p?.register ? p : null;
}

/** Builds 1.0.2 and later can put a number on the app icon. */
function badgeSupported(): boolean {
  try {
    const cap = (window as unknown as { Capacitor?: { isPluginAvailable?: (n: string) => boolean } }).Capacitor;
    return !!cap?.isPluginAvailable?.("Badge");
  } catch {
    return false;
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

async function forgetThisPhone() {
  const token = read(TOKEN_KEY);
  if (!token) return;
  write(TOKEN_KEY, null);
  await fetch("/api/push/unregister", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}

export default function AppPush() {
  const router = useRouter();
  const [offer, setOffer] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isInApp()) return;
    const push = pushPlugin();
    if (!push) return;

    const listeners: Promise<Listener>[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    listeners.push(
      push.addListener("registration", ({ value }) => {
        write(TOKEN_KEY, value);
        fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: value,
            platform: appPlatform(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            badges: badgeSupported(),
          }),
        }).catch(() => {});
      })
    );
    listeners.push(
      push.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const link = notification?.data?.link;
        // Only paths on this site.
        if (link && link.startsWith("/") && !link.startsWith("//")) router.push(link);
        else router.push("/notifications");
      })
    );

    const supabase = createClient();

    async function start(signedIn: boolean) {
      if (cancelled || !push) return;
      if (!signedIn) {
        setOffer(false);
        await forgetThisPhone();
        return;
      }
      const { receive } = await push.checkPermissions().catch(() => ({ receive: "denied" as PermissionState }));
      if (receive === "granted") {
        await push.register().catch(() => {});
        return;
      }
      if (receive === "denied") return;
      const asked = Number(read(ASKED_KEY) ?? 0);
      if (Date.now() - asked < ASK_AGAIN_MS) return;
      timer = setTimeout(() => !cancelled && setOffer(true), 4000);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => start(Boolean(data.session)))
      .catch(() => {});

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") start(false);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.subscription.unsubscribe();
      listeners.forEach((l) => l.then((x) => x.remove()).catch(() => {}));
    };
  }, [router]);

  async function turnOn() {
    const push = pushPlugin();
    if (!push) return;
    setBusy(true);
    write(ASKED_KEY, String(Date.now()));
    const { receive } = await push.requestPermissions().catch(() => ({ receive: "denied" as PermissionState }));
    if (receive === "granted") await push.register().catch(() => {});
    setBusy(false);
    setOffer(false);
  }

  function notNow() {
    write(ASKED_KEY, String(Date.now()));
    setOffer(false);
  }

  if (!offer) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-cyan-400/30 bg-ocean-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur md:bottom-6">
      <button
        type="button"
        onClick={notNow}
        aria-label="Not now"
        className="absolute right-3 top-3 text-ocean-400 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
          <Bell className="h-4 w-4 text-cyan-300" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-white">Know when someone answers</p>
          <p className="mt-0.5 text-sm leading-snug text-ocean-300">
            Messages about your ads, replies to your posts and comments, straight to your phone.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={turnOn}
          disabled={busy}
          className="flex-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-ocean-950 transition-colors hover:bg-cyan-400 disabled:opacity-60"
        >
          {busy ? "One moment…" : "Turn on"}
        </button>
        <button
          type="button"
          onClick={notNow}
          className="rounded-xl border border-ocean-700 px-4 py-2 text-sm text-ocean-200 hover:border-ocean-500"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
