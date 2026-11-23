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

  useEffect(() => {
    setInApp(/UAApp/.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!inApp) return;
    const header = () => document.querySelector("header")?.getBoundingClientRect().bottom ?? 80;

    const onScroll = () => {
      const d = Math.max(0, -window.scrollY);
      setPull(d);
      if (d > 0) setTop(header());
      if (touching.current && d >= PULL && !armed.current) {
        armed.current = true;
        tap();
      } else if (d < PULL * 0.8) {
        armed.current = false;
      }
    };
    const onStart = () => {
      touching.current = true;
    };
    const onEnd = () => {
      touching.current = false;
      if (armed.current) {
        armed.current = false;
        setSpinning(true);
        startTransition(() => router.refresh());
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [inApp, router]);

  // Keep spinning until the refresh lands, and at least long enough to be seen.
  useEffect(() => {
    if (!spinning || pending) return;
    const t = setTimeout(() => setSpinning(false), 350);
    return () => clearTimeout(t);
  }, [spinning, pending]);

  if (!inApp) return null;
  const progress = Math.min(1, pull / PULL);
  const visible = spinning || pull > 4;

  return (
    <div
      aria-hidden={!spinning}
      role={spinning ? "status" : undefined}
      className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 transition-opacity duration-200"
      style={{
        top: top + (spinning ? 12 : Math.min(pull, PULL + 20) / 2 - 18),
        opacity: visible ? (spinning ? 1 : Math.max(0.2, progress)) : 0,
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
