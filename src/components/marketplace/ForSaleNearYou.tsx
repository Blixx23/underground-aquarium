"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Crosshair, Fish, Loader2, MapPin, Plus, Tag } from "lucide-react";
import { formatPrice, listingHref } from "@/lib/marketplace/listings";
import { milesBetween } from "@/lib/marketplace/match";
import AlertMeButton, { type AlertPlace } from "@/components/marketplace/AlertMeButton";

type Ad = {
  slug: string;
  title: string;
  price_cents: number | null;
  is_free: boolean;
  is_wanted: boolean;
  city: string | null;
  state_code: string;
  image: string | null;
  lat: number | null;
  lng: number | null;
  area: string | null;
  bumped_at: string;
};

/**
 * "For sale near you" on a species page: live classified ads that mention
 * this fish, nearest first when we know roughly where the visitor is (their
 * last classifieds area, or "Use my location", which never leaves the
 * browser). With nothing listed, it offers an alert instead of a dead end.
 */
export default function ForSaleNearYou({ slug, name, category }: { slug: string; name: string; category: string }) {
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [center, setCenter] = useState<AlertPlace | null>(null);
  const [locating, setLocating] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let region = "";
    try {
      region = (JSON.parse(localStorage.getItem("ua:lastRegion") ?? "null") as { regionId?: string } | null)?.regionId ?? "";
    } catch {
      /* storage blocked */
    }
    fetch(`/api/marketplace/for-species?slug=${encodeURIComponent(slug)}${region ? `&region=${encodeURIComponent(region)}` : ""}`)
      .then((r) => r.json())
      .then((j: { ads?: Ad[]; center?: { name: string; state_code: string; lat: number | null; lng: number | null } | null }) => {
        setAds(j.ads ?? []);
        const c = j.center;
        if (c && c.lat != null && c.lng != null) setCenter({ label: `${c.name}, ${c.state_code}`, lat: c.lat, lng: c.lng });
      })
      .catch(() => setAds([]));
  }, [slug]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCenter({ label: "you", lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10_000, maximumAge: 600_000 }
    );
  }

  const sorted = useMemo(() => {
    if (!ads) return [];
    const withMiles = ads.map((a) => ({
      ...a,
      miles: center && a.lat != null && a.lng != null ? Math.round(milesBetween(center, { lat: a.lat, lng: a.lng })) : null,
    }));
    return center ? withMiles.sort((a, b) => (a.miles ?? 1e9) - (b.miles ?? 1e9)) : withMiles;
  }, [ads, center]);

  if (ads === null) {
    return (
      <section id="for-sale" className="mb-8 rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-5">
        <p className="flex items-center gap-2 text-sm text-ocean-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking for {name} for sale...
        </p>
      </section>
    );
  }

  const shown = showAll ? sorted : sorted.slice(0, 6);
  // An alert only searches around a real area, not the visitor's exact spot.
  const alertPlace = center && center.label !== "you" ? center : null;

  return (
    <section id="for-sale" className="mb-8 scroll-mt-24 rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl text-white">
            <Tag className="h-5 w-5 text-emerald-300" /> {name} for sale
          </h2>
          <p className="mt-1 text-sm text-ocean-300">
            {sorted.length === 0
              ? "From hobbyists on our free classifieds. Local pickup, no fees."
              : center
                ? `Nearest to ${center.label} first. Local pickup, no fees.`
                : "From hobbyists on our free classifieds. Local pickup, no fees."}
          </p>
        </div>
        {sorted.length > 0 && !center && (
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-full border border-ocean-700 px-3 py-1.5 text-sm text-ocean-100 hover:border-emerald-500 disabled:opacity-60"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} Nearest to me
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-ocean-800/60 p-5 text-center">
          <Fish className="mx-auto mb-2 h-7 w-7 text-ocean-500" />
          <p className="text-white">Nobody has {name} listed right now.</p>
          <p className="mt-1 text-sm text-ocean-300">Get told the moment someone near you does.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <AlertMeButton defaultQuery={name} defaultCategory={category} place={alertPlace} label={`Alert me about ${name}`} />
            <Link href="/post" className="inline-flex items-center gap-1.5 text-sm text-ocean-200 underline-offset-4 hover:text-white hover:underline">
              <Plus className="h-4 w-4" /> Selling some? Post a free ad
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {shown.map((a) => (
              <li key={a.slug}>
                <Link
                  href={listingHref(a.slug)}
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:border-emerald-500/40 hover:bg-white/10"
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ocean-900">
                    {a.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Fish className="h-6 w-6 text-ocean-600" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{a.title}</span>
                    <span className="block text-sm text-ocean-100">
                      {a.is_wanted ? "Wanted" : a.is_free ? "Free" : formatPrice(a.price_cents)}
                    </span>
                    <span className="flex items-center gap-1 truncate text-xs text-ocean-300">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {a.city ?? a.area ?? a.state_code}, {a.state_code}
                      {a.miles != null ? ` · about ${a.miles} mi` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            {sorted.length > 6 && (
              <button type="button" onClick={() => setShowAll(!showAll)} className="text-sm text-emerald-300 hover:text-emerald-200">
                {showAll ? "Show fewer" : `Show all ${sorted.length}`}
              </button>
            )}
            <AlertMeButton
              defaultQuery={name}
              defaultCategory={category}
              place={alertPlace}
              label={`Alert me about new ${name} ads`}
              className="inline-flex items-center gap-1.5 text-sm text-ocean-200 underline-offset-4 hover:text-white hover:underline"
            />
          </div>
        </>
      )}
    </section>
  );
}
