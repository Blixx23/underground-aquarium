"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import ShopLogo from "@/components/stores/ShopLogo";
import Stars from "@/components/stores/Stars";
import type { ClaimedShop } from "@/lib/stores/claimedNearby";

/**
 * Nearby claimed shops, shown on classified ads and forum threads. Free
 * advertising for shops that claim their page. Draws nothing when there are
 * no claimed shops nearby, so pages never show an empty box.
 */
export default function LocalShopsAd({
  lat,
  lng,
  className = "",
}: {
  /** An ad's region. Leave out to use the visitor's rough location. */
  lat?: number | null;
  lng?: number | null;
  className?: string;
}) {
  const [shops, setShops] = useState<ClaimedShop[] | null>(null);

  useEffect(() => {
    const q = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : "";
    let cancelled = false;
    fetch(`/api/stores/claimed-near${q}`)
      .then((r) => (r.ok ? r.json() : { shops: [] }))
      .then((d: { shops?: ClaimedShop[] }) => {
        if (!cancelled) setShops(d.shops ?? []);
      })
      .catch(() => {
        if (!cancelled) setShops([]);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (!shops || shops.length === 0) return null;

  return (
    <section className={`rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg text-white">
          <Store className="h-5 w-5 text-emerald-400" />
          Local fish stores near you
        </h2>
        <Link href="/stores" className="text-sm text-ocean-400 transition-colors hover:text-white">
          All shops →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {shops.map((s) => (
          <Link
            key={s.id}
            href={`/stores/${s.slug}`}
            className="flex items-center gap-3 rounded-xl border border-ocean-800/60 bg-ocean-950/50 p-3 transition-colors hover:border-emerald-500/40"
          >
            <ShopLogo name={s.name} url={s.logo_url} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{s.name}</p>
              <p className="truncate text-xs text-ocean-400">
                {[s.city, s.state].filter(Boolean).join(", ")}
                {` · ${s.miles < 1 ? "under 1" : Math.round(s.miles)} mi`}
              </p>
              <Stars rating={s.rating_avg} count={s.rating_count} size={12} className="mt-1" />
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-ocean-500">
        Own a fish store?{" "}
        <Link href="/stores" className="underline transition-colors hover:text-ocean-300">
          Claim your free shop page
        </Link>{" "}
        to show up here.
      </p>
    </section>
  );
}
