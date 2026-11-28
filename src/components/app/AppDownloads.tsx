"use client";

import { useEffect } from "react";
import { isInApp } from "@/lib/app/nativeSignIn";

/**
 * Downloads inside the app. The app's web view can't save a file the way a
 * browser does, so a "Download PDF" (certificates, shop posters, share cards,
 * your data export) would either do nothing or swap the whole screen for the
 * file. Inside the app, those taps fetch the file and open iPhone's share
 * sheet instead: Save to Files, Print, AirDrop, Messages. If sharing isn't
 * possible, the file opens on screen (swipe back to return).
 */
const DOWNLOAD_PATHS = [/^\/api\/society\/certificate/, /^\/api\/stores\/[^/]+\/poster/, /^\/api\/account\/export/];

function filenameFrom(res: Response, fallback: string): string {
  const cd = res.headers.get("content-disposition") ?? "";
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  return m ? decodeURIComponent(m[1]) : fallback;
}

export default function AppDownloads() {
  useEffect(() => {
    if (!isInApp()) return;
    const onClick = async (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a || !a.href) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      const sameSite = url.origin === location.origin || url.protocol === "blob:" || url.protocol === "data:";
      const isDownload = a.hasAttribute("download") || (sameSite && DOWNLOAD_PATHS.some((r) => r.test(url.pathname)));
      if (!isDownload || !sameSite) return;

      e.preventDefault();
      try {
        const res = await fetch(url.toString(), { credentials: "include" });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const name = a.getAttribute("download") || filenameFrom(res, url.pathname.split("/").pop() || "download");
        const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], title: name }).catch(() => {});
          return;
        }
        throw new Error("no share");
      } catch {
        // Show it on screen instead; certificates have an on-screen version.
        if (url.pathname.startsWith("/api/society/certificate")) url.searchParams.set("inline", "1");
        location.assign(url.toString());
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
