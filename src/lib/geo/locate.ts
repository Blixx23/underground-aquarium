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
 */
export function locate(
  onSuccess: PositionCallback,
  onError: (err: GeolocationPositionError | null) => void,
  options: PositionOptions = {},
  hardLimitMs = 15_000
): void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError(null);
    return;
  }
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    onError(null);
  }, hardLimitMs);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      onSuccess(pos);
    },
    (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      onError(err);
    },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000, ...options }
  );
}
