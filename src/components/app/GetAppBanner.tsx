"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { APP_STORE_URL } from "@/lib/config";

const KEY = "ua:appBannerClosed";
const QUIET_DAYS = 14;

/**
 * A bright "Get the app" bar for iPhone and iPad visitors on the website.
 * Safari's own app banner takes the page's dark colours and disappears
 * into it, so this replaces it. Never shown inside the app itself, and
 * once closed it stays away for two weeks.
 */
export default function GetAppBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!APP_STORE_URL) return;
    const ua = navigator.userAgent;
    const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (!iOS || /UAApp/.test(ua)) return;
    try {
      const closed = Number(localStorage.getItem(KEY) ?? 0);
      if (Date.now() - closed < QUIET_DAYS * 86_400_000) return;
    } catch {
      /* private browsing: show it */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  function close() {
    setShow(false);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* fine */
    }
  }

  return (
    <div
      role="region"
      aria-label="Get the Underground Aquarium app"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[60] flex items-center gap-3 rounded-2xl border border-white/70 bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl shadow" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-tight text-ocean-950">Underground Aquarium</p>
        <p className="truncate text-xs font-medium text-ocean-900">Free on the App Store</p>
      </div>
      <a
        href={APP_STORE_URL}
        onClick={close}
        className="shrink-0 rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white shadow hover:bg-ocean-900"
      >
        Get the app
      </a>
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="shrink-0 rounded-full p-1.5 text-ocean-900 hover:bg-white/40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
