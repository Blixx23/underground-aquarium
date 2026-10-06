"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Search boxes and filters that survive the back arrow.
 *
 * useUrlParam keeps one value in the page address (?q=tetra&class=b), so
 * going back to the list, refreshing or sharing the link lands on the same
 * results. useRestoreScroll puts you back at the spot you scrolled to,
 * once the filtered list has drawn.
 */

function writeParam(key: string, value: string, fallback: string) {
  const p = new URLSearchParams(window.location.search);
  if (value && value !== fallback) p.set(key, value);
  else p.delete(key);
  const qs = p.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    // Keep Next's own history state so its back and forward still work.
    window.history.replaceState(window.history.state, "", url);
  }
}

/** One string value kept in the address. `ready` turns true once it's been read back. */
export function useUrlParam(key: string, fallback = "", initial?: string): [string, (v: string) => void, boolean] {
  const [value, setValue] = useState(initial ?? fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get(key);
    if (v != null) setValue(v);
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) writeParam(key, value, fallback);
  }, [key, value, fallback, ready]);
  return [value, setValue, ready];
}

const STORE = "ua:scroll";

// Did we arrive with the back or forward arrow? (In-app: a popstate just
// happened. Full page load: the browser says so.)
let poppedAt = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    poppedAt = Date.now();
  });
}
let loadChecked = false;
function cameBack(): boolean {
  if (Date.now() - poppedAt < 5000) return true;
  // The page-load answer only counts for the first list shown after that load.
  if (loadChecked) return false;
  loadChecked = true;
  const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "back_forward";
}

/**
 * Remember how far down the list you were when you tapped into something,
 * and put you back there when you come back. `ready` should be true once the
 * list shows the restored search (so the page is the right height).
 */
export function useRestoreScroll(ready: boolean) {
  const done = useRef(false);

  // Save the spot whenever you leave by tapping a link or the page is hidden.
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(STORE, JSON.stringify({ url: window.location.href, y: window.scrollY, at: Date.now() }));
      } catch {
        // Private mode: nothing to remember, nothing breaks.
      }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest("a[href]")) save();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", save);
    };
  }, []);

  const restore = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      const s = JSON.parse(raw) as { url: string; y: number; at: number };
      // Only when coming back to the exact same list, within the hour.
      if (!cameBack() || s.url !== window.location.href || Date.now() - s.at > 3600_000 || s.y < 50) return;
      sessionStorage.removeItem(STORE);
      // Two frames: let the restored results draw first.
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, s.y)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    restore();
  }, [ready, restore]);
}
