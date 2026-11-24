"use client";

/**
 * navigator.geolocation.getCurrentPosition with a hard time limit.
 *
 * The browser's own `timeout` only starts once the person has answered the
 * "Allow location?" question. If that question never shows (an iPhone app
 * build without the location permission text, a dismissed prompt, a browser
 * that never answers), the page would wait forever on "Locating…". This
 * gives up after `hardLimitMs` and calls `onError` like any other failure,
 * so every caller falls back to typing a city instead of freezing.
 *
 * Remembered area: each time someone shares their location we keep a rounded
 * copy (about half a mile, never the exact spot) on their own device only. If
 * they later say no, or location times out, we quietly use that last area
 * instead of an error. Nothing is sent to us or stored on the server.
 */
export function locate(
  onSuccess: PositionCallback,
  onError: (err: GeolocationPositionError | null) => void,
  options: PositionOptions = {},
  hardLimitMs = 15_000
): void {
  // Fall back to the last shared area before giving up.
  const fail = (err: GeolocationPositionError | null) => {
    const saved = lastArea();
    if (saved) onSuccess(saved);
    else onError(err);
  };
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    fail(null);
    return;
  }
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    fail(null);
  }, hardLimitMs);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rememberArea(pos.coords.latitude, pos.coords.longitude);
      onSuccess(pos);
    },
    (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fail(err);
    },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000, ...options }
  );
}

const KEY = "ua:lastArea";
/** How long a remembered area stays good: people move, but not often. */
const KEEP_DAYS = 180;

/** Save a rounded copy (2 decimals, about half a mile) on this device only. */
export function rememberArea(lat: number, lng: number) {
  try {
    const round = (n: number) => Math.round(n * 100) / 100;
    window.localStorage.setItem(KEY, JSON.stringify({ lat: round(lat), lng: round(lng), at: Date.now() }));
  } catch {
    /* storage blocked: nothing remembered */
  }
}

/** The last area this device shared, shaped like a browser position, or null. */
export function lastArea(): GeolocationPosition | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { lat?: number; lng?: number; at?: number };
    if (typeof v.lat !== "number" || typeof v.lng !== "number" || typeof v.at !== "number") return null;
    if (Date.now() - v.at > KEEP_DAYS * 86_400_000) return null;
    const coords = {
      latitude: v.lat,
      longitude: v.lng,
      accuracy: 1000,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON() {
        return { latitude: v.lat, longitude: v.lng, accuracy: 1000 };
      },
    } as unknown as GeolocationCoordinates;
    return {
      coords,
      timestamp: v.at,
      toJSON() {
        return { coords: coords.toJSON(), timestamp: v.at };
      },
    } as unknown as GeolocationPosition;
  } catch {
    return null;
  }
}
