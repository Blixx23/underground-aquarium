"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

/**
 * Pull to refresh, inside the iPhone app only (its user agent says "UAApp").
 *
 * The app lets the page rubber-band past the top like any iPhone app. As you
 * pull, a gap opens under the fixed header and this indicator sits in it:
 * the arrow turns with your finger and fills in once you've pulled far
 * enough. Let go past that point and the page refreshes in place (fresh data
 * from the server, no white flash), with the arrow spinning until it's done.
 * In a normal browser this renders nothing.
 */
const PULL = 70; // how far to pull, in px, before letting go refreshes
const GAP = 56; // the room the arrow gets under the header while refreshing

type Haptics = { impact?: (o: { style: string }) => Promise<void> };

function tap() {
  try {
    const h = (window as unknown as { Capacitor?: { Plugins?: { Haptics?: Haptics } } }).Capacitor?.Plugins?.Haptics;
    h?.impact?.({ style: "LIGHT" });
  } catch {
    /* no haptics: fine */
  }
}

export default function PullToRefresh() {
  const router = useRouter();
  const [inApp, setInApp] = useState(false);
  const [pull, setPull] = useState(0);
  const [top, setTop] = useState(80);
  const [pending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);
  const armed = useRef(false);
  const touching = useRef(false);

  // In the app: our user-agent tag, or Capacitor's own bridge saying it's native.
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    setInApp(/UAApp/.test(navigator.userAgent) || Boolean(cap?.isNativePlatform?.()));
  }, []);

  useEffect(() => {
    if (!inApp) return;
    const header = () => document.querySelector("header")?.getBoundingClientRect().bottom ?? 80;

    // Follow the finger: a pull only counts when it starts with the page at the
    // very top, and it's measured from the touch itself (half the finger's
    // travel, so it feels weighted, like the page stretching).
    let startY: number | null = null;
    const update = (d: number) => {
      setPull(d);
      if (d > 0) setTop(header());
      if (d >= PULL && !armed.current) {
        armed.current = true;
        tap();
      } else if (d < PULL * 0.8) {
        armed.current = false;
      }
    };
    const onStart = (e: TouchEvent) => {
      touching.current = true;
      startY = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      if (window.scrollY > 2) {
        // The page scrolled instead: not a pull.
        startY = null;
        update(0);
        return;
      }
      update(Math.max(0, (e.touches[0].clientY - startY) * 0.5));
    };
    const onScroll = () => {
      // Some phones report the stretch as a negative scroll; use it if bigger.
      const over = Math.max(0, -window.scrollY);
      if (touching.current && over > 0) update(Math.max(over, armed.current ? PULL : 0));
      else if (!touching.current && !spinning) setPull(over);
    };
    const onEnd = () => {
      touching.current = false;
      startY = null;
      if (armed.current) {
        armed.current = false;
        setSpinning(true);
        startTransition(() => router.refresh());
      }
      setPull(0);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [inApp, router, spinning]);

  // While refreshing, hold the page down so the arrow has its own gap under
  // the header (like Mail or Instagram), then let it slide back up.
  useEffect(() => {
    const page = document.getElementById("content");
    if (!inApp || !page) return;
    page.style.transition = "transform 250ms ease";
    page.style.transform = spinning ? `translateY(${GAP}px)` : "";
    return () => {
      page.style.transform = "";
    };
  }, [spinning, inApp]);

  // Keep spinning until the refresh lands, and at least long enough to be seen.
  useEffect(() => {
    if (!spinning || pending) return;
    const t = setTimeout(() => setSpinning(false), 350);
    return () => clearTimeout(t);
  }, [spinning, pending]);

  if (!inApp) return null;
  const progress = Math.min(1, pull / PULL);
  // Hidden until the gap under the header is big enough to hold it, so it
  // never sits on top of the page.
  const reveal = spinning ? 1 : Math.max(0, Math.min(1, (pull - 24) / 30));
  return (
    <div
      aria-hidden={!spinning}
      role={spinning ? "status" : undefined}
      className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 transition-opacity duration-200"
      style={{
        // Centered in the gap: the gap is GAP tall while refreshing.
        top: top + (GAP - 36) / 2,
        opacity: reveal,
      }}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-lg shadow-black/40 transition-colors ${
          progress >= 1 || spinning
            ? "border-ocean-500/60 bg-ocean-800 text-ocean-100"
            : "border-ocean-700/60 bg-ocean-900 text-ocean-400"
        }`}
      >
        <RotateCw
          className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
          style={spinning ? undefined : { transform: `rotate(${progress * 300}deg)` }}
        />
      </span>
      {spinning && <span className="sr-only">Refreshing</span>}
    </div>
  );
}
