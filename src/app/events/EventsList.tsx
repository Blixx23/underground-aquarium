"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Globe,
  Store,
  Users,
  Navigation,
} from "lucide-react";

export type EventCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  starts_at: string;
  is_online: boolean;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
  host_kind: string;
  hostLabel: string;
  lat: number | null;
  lng: number | null;
};

function formatWhen(iso: string, tz: string | null) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || "America/Los_Angeles",
    });
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtDist(mi: number) {
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

export default function EventsList({ events }: { events: EventCard[] }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function findNearMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Your browser doesn't support location.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError(
          "Couldn't get your location — check that you allowed the permission."
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }

  const { sorted, distanceById } = useMemo(() => {
    const distanceById = new Map<string, number>();
    if (!coords) return { sorted: events, distanceById };

    const withDist = events.map((e) => {
      let d: number | null = null;
      if (!e.is_online && e.lat != null && e.lng != null) {
        d = haversineMiles(coords.lat, coords.lng, e.lat, e.lng);
        distanceById.set(e.id, d);
      }
      return { e, d };
    });

    const located = withDist
      .filter((x) => x.d != null)
      .sort((a, b) => (a.d as number) - (b.d as number))
      .map((x) => x.e);
    const rest = withDist.filter((x) => x.d == null).map((x) => x.e);

    return { sorted: [...located, ...rest], distanceById };
  }, [coords, events]);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
        <Calendar className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
        <p className="text-white font-medium mb-1">No upcoming events yet</p>
        <p className="text-ocean-400 text-sm">
          Be the first to put one on the map.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Near-me control */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          onClick={findNearMe}
          disabled={locating}
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 text-ocean-200 px-4 py-2.5 text-sm font-medium hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
        >
          <Navigation className="w-4 h-4" />
          {locating ? "Locating…" : "Find events near me"}
        </button>
        {coords && (
          <span className="text-sm text-emerald-400 flex items-center gap-2">
            Sorted by distance
            <button
              onClick={() => setCoords(null)}
              className="text-ocean-400 hover:text-white underline underline-offset-2"
            >
              clear
            </button>
          </span>
        )}
        {geoError && <span className="text-sm text-ocean-400">{geoError}</span>}
      </div>

      <div className="space-y-4">
        {sorted.map((ev) => {
          const place = ev.is_online
            ? "Online"
            : [ev.venue_name, ev.city, ev.state].filter(Boolean).join(", ") ||
              "Location TBA";
          const dist = distanceById.get(ev.id);
          return (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="block rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
            >
              {ev.cover_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ev.cover_image}
                  alt=""
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-5">
                <p className="text-emerald-400 text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatWhen(ev.starts_at, ev.timezone)}
                </p>
                <h3 className="text-white font-medium text-lg mt-1.5">
                  {ev.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ocean-400">
                  <span className="flex items-center gap-1.5">
                    {ev.host_kind === "store" ? (
                      <Store className="w-3.5 h-3.5" />
                    ) : (
                      <Users className="w-3.5 h-3.5" />
                    )}
                    {ev.hostLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {ev.is_online ? (
                      <Globe className="w-3.5 h-3.5" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5" />
                    )}
                    {place}
                  </span>
                  {dist != null && (
                    <span className="text-emerald-400">
                      {fmtDist(dist)} away
                    </span>
                  )}
                </div>
                {ev.description && (
                  <p className="text-ocean-300 text-sm mt-3 line-clamp-2">
                    {ev.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}