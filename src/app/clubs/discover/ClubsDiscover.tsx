"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Navigation, Search } from "lucide-react";

type Club = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  dues_amount_cents: number | null;
  lat: number | null;
  lng: number | null;
  member_count: number | null;
};

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
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

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function ClubsDiscover({ clubs }: { clubs: Club[] }) {
  const [q, setQ] = useState("");
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

  const { list, distById } = useMemo(() => {
    const term = q.trim().toLowerCase();
    let filtered = clubs;
    if (term) {
      filtered = clubs.filter((c) =>
        [c.name, c.city, c.state]
          .filter(Boolean)
          .some((s) => (s as string).toLowerCase().includes(term))
      );
    }

    const distById = new Map<string, number>();
    if (!coords) return { list: filtered, distById };

    const withDist = filtered.map((c) => {
      let d: number | null = null;
      if (c.lat != null && c.lng != null) {
        d = haversineMiles(coords.lat, coords.lng, c.lat, c.lng);
        distById.set(c.id, d);
      }
      return { c, d };
    });
    const located = withDist
      .filter((x) => x.d != null)
      .sort((a, b) => (a.d as number) - (b.d as number))
      .map((x) => x.c);
    const rest = withDist.filter((x) => x.d == null).map((x) => x.c);
    return { list: [...located, ...rest], distById };
  }, [clubs, q, coords]);

  if (clubs.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-12 text-center">
        <Users className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
        <p className="text-white font-medium mb-1">No public clubs yet</p>
        <p className="text-ocean-400 text-sm">
          Be the first — start one and invite your local hobbyists.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-ocean-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by club, city, or state"
            className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500"
          />
        </div>
        <button
          onClick={findNearMe}
          disabled={locating}
          className="inline-flex items-center gap-2 rounded-xl bg-ocean-900/60 border border-ocean-800/60 text-ocean-200 px-4 py-2.5 text-sm font-medium hover:text-white hover:border-ocean-600 transition-colors disabled:opacity-50"
        >
          <Navigation className="w-4 h-4" />
          {locating ? "Locating…" : "Near me"}
        </button>
        {coords && (
          <span className="text-sm text-emerald-300 flex items-center gap-2">
            Sorted by distance
            <button
              onClick={() => setCoords(null)}
              className="text-ocean-400 hover:text-white underline underline-offset-2"
            >
              clear
            </button>
          </span>
        )}
      </div>
      {geoError && <p className="text-sm text-ocean-400 mb-4">{geoError}</p>}

      {list.length === 0 ? (
        <p className="text-ocean-400 text-sm py-8 text-center">
          No clubs match &ldquo;{q}&rdquo;.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const place =
              [c.city, c.state].filter(Boolean).join(", ") || "Location TBA";
            const dist = distById.get(c.id);
            return (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="flex items-center gap-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-5 py-4 hover:bg-ocean-800/40 transition-colors"
              >
                {c.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.logo_url}
                    alt={c.name}
                    className="w-12 h-12 rounded-xl object-cover border border-ocean-800/60 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-ocean-800/60 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-ocean-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{c.name}</p>
                  <p className="text-sm text-ocean-400">
                    {place}
                    {c.dues_amount_cents && c.dues_amount_cents > 0
                      ? ` · Dues ${money(c.dues_amount_cents)}`
                      : ""}
                  </p>
                  <p className="text-xs text-ocean-500 mt-0.5">
                    {c.member_count ?? 0} member
                    {c.member_count === 1 ? "" : "s"}
                  </p>
                </div>
                {dist != null && (
                  <span className="text-xs text-emerald-300 shrink-0">
                    {fmtDist(dist)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
