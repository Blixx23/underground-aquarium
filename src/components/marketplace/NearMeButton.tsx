"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Loader2 } from "lucide-react";

export type LocatableRegion = {
  state_code: string;
  slug: string;
  name: string;
  state_name: string;
  lat: number;
  lng: number;
};

const DEFAULT_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-ocean-600 px-6 py-3.5 font-medium text-white transition-colors hover:bg-ocean-500 disabled:opacity-60";

/** Great-circle distance in miles. */
function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Asks the browser where you are, then sends you to the nearest metro area.
 * Coordinates never leave the browser — the whole region list is already on
 * the page, so the match happens locally and nothing is sent to a server.
 */
export default function NearMeButton({
  regions,
  className,
  wrapperClassName,
  label = "Near me",
  fallbackHref,
}: {
  regions: LocatableRegion[];
  /** Button text when idle. */
  label?: string;
  /** Where to send people to pick an area by hand if location fails. */
  fallbackHref?: string;
  /** Replaces the button's classes outright, so a caller can match a button row exactly. */
  className?: string;
  wrapperClassName?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing to match against yet.
  if (regions.length === 0) return null;

  function locate() {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("This browser can't share your location. Pick your state below.");
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        let best: LocatableRegion | null = null;
        let bestDistance = Infinity;
        for (const r of regions) {
          const d = distanceMiles(latitude, longitude, r.lat, r.lng);
          if (d < bestDistance) {
            bestDistance = d;
            best = r;
          }
        }

        if (!best) {
          setBusy(false);
          setError("Couldn't work out your closest area. Pick your state below.");
          return;
        }

        router.push(
          `/marketplace/${best.state_code.toLowerCase()}/${best.slug}`
        );
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked for this site. Pick your state below instead."
            : "Couldn't get your location. Pick your state below instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        className={className ?? DEFAULT_BUTTON_CLASS}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <Crosshair className="h-4 w-4 shrink-0" />
        )}
        {busy ? "Finding…" : label}
      </button>

      {error && (
        <p className="mt-3 text-sm text-amber-200">
          {fallbackHref ? error.replace(/ Pick your state below( instead)?\./, "") : error}
          {fallbackHref && (
            <>
              {" "}
              <a href={fallbackHref} className="underline underline-offset-2 hover:text-white">
                Pick your area
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
