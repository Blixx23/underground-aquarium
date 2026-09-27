"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** Shown under the name in the popup: "Sacramento, CA" or "5.7 mi". */
  sub?: string | null;
  /** The shop this page is about: drawn larger and brighter. */
  main?: boolean;
};

/**
 * A map of fish stores. Leaflet with free OpenStreetMap-based tiles, loaded
 * only in the browser. Pins are drawn on a canvas, so a state with hundreds
 * of shops stays smooth on a phone.
 */
export default function StoreMap({
  points,
  height = 280,
  you,
  className = "",
}: {
  points: MapPoint[];
  height?: number;
  /** The visitor's own location, when they tapped "Near me". */
  you?: { lat: number; lng: number } | null;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const layer = useRef<import("leaflet").LayerGroup | null>(null);
  const key = points.map((p) => p.slug).join("|") + (you ? `@${you.lat},${you.lng}` : "");

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current || map.current) return;
      const m = L.map(box.current, {
        preferCanvas: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(m);
      m.setView([39.5, -98.35], 4);
      map.current = m;
      layer.current = L.layerGroup().addTo(m);
      draw(L);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw the pins when the list changes.
  useEffect(() => {
    (async () => {
      if (!map.current) return;
      const L = (await import("leaflet")).default;
      draw(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function draw(L: typeof import("leaflet")) {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const bounds: [number, number][] = [];
    for (const p of pts) {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: p.main ? 9 : 6,
        color: p.main ? "#fbbf24" : "#34d399",
        weight: 2,
        fillColor: p.main ? "#fbbf24" : "#10b981",
        fillOpacity: 0.85,
      });
      const wrap = document.createElement("div");
      const a = document.createElement("a");
      a.href = `/stores/${p.slug}`;
      a.textContent = p.name;
      a.style.fontWeight = "600";
      wrap.appendChild(a);
      if (p.sub) {
        const s = document.createElement("div");
        s.textContent = p.sub;
        s.style.opacity = "0.75";
        s.style.fontSize = "12px";
        wrap.appendChild(s);
      }
      marker.bindPopup(wrap);
      marker.addTo(g);
      bounds.push([p.lat, p.lng]);
    }
    if (you) {
      L.circleMarker([you.lat, you.lng], {
        radius: 7,
        color: "#38bdf8",
        weight: 3,
        fillColor: "#0ea5e9",
        fillOpacity: 1,
      })
        .bindPopup("You are here")
        .addTo(g);
      bounds.push([you.lat, you.lng]);
    }
    if (bounds.length === 1) m.setView(bounds[0], 12);
    else if (bounds.length > 1) m.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
  }

  return (
    <div
      ref={box}
      style={{ height }}
      className={`relative z-0 w-full overflow-hidden rounded-2xl border border-white/10 bg-ocean-950 ${className}`}
      aria-label="Map of fish stores"
      role="region"
    />
  );
}
