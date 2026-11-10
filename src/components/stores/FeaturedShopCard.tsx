"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, MapPin, Sparkles, Store } from "lucide-react";
import ShopLogo from "@/components/stores/ShopLogo";
import Stars from "@/components/stores/Stars";
import { createClient } from "@/lib/supabase/client";
import type { ClaimedShop } from "@/lib/stores/claimedNearby";

/*
 * Featured shops, mixed in among classified ads and forum threads so they
 * look like they belong there. Free for now; built as a spot that can be sold
 * later. Each shop counts a "seen" once per browser per day when its card is
 * at least half on screen; the owner gets the total in the Monday report.
 */

const MAX = 6;
const cache = new Map<string, Promise<ClaimedShop[]>>();

/** One fetch per page and place, shared by every card on the page. */
function loadShops(lat?: number | null, lng?: number | null): Promise<ClaimedShop[]> {
  const where = lat != null && lng != null ? `lat=${lat}&lng=${lng}&` : "";
  const key = where || "visitor";
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/api/stores/claimed-near?${where}limit=${MAX}`)
      .then((r) => (r.ok ? r.json() : { shops: [] }))
      .then((d: { shops?: ClaimedShop[] }) => d.shops ?? [])
      .catch(() => []);
    cache.set(key, p);
  }
  return p;
}

function countSeen(shopId: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `ua-featured-${shopId}`;
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
  } catch {
    /* private browsing: count it anyway */
  }
  createClient().rpc("record_store_event", { p_store: shopId, p_kind: "featured" });
}

function countClick(shopId: string) {
  createClient().rpc("record_store_event", { p_store: shopId, p_kind: "featured_click" });
}

function place(s: ClaimedShop) {
  const town = [s.city, s.state].filter(Boolean).join(", ");
  const mi = s.miles < 1 ? "under 1 mi" : `${Math.round(s.miles).toLocaleString("en-US")} mi`;
  return { town, mi };
}

export default function FeaturedShopCard({
  slot,
  variant,
  lat,
  lng,
}: {
  /** Which featured shop this spot shows: 0 is the nearest, 1 the next, and so on. */
  slot: number;
  /** "tile" = homepage Just posted, "card" = classifieds grid, "forum" = thread row. */
  variant: "tile" | "card" | "forum";
  /** A place to measure from (an ad's region). Leave out for the visitor's rough location. */
  lat?: number | null;
  lng?: number | null;
}) {
  const [shop, setShop] = useState<ClaimedShop | null>(null);
  const ref = useRef<HTMLAnchorElement | HTMLElement | null>(null);

  useEffect(() => {
    let live = true;
    loadShops(lat, lng).then((list) => {
      if (live) setShop(list[slot] ?? null);
    });
    return () => {
      live = false;
    };
  }, [lat, lng, slot]);

  // Only count it once it's actually on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || !shop) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        countSeen(shop.id);
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shop]);

  if (!shop) return null;
  const href = `/stores/${shop.slug}`;
  const { town, mi } = place(shop);
  const picture = shop.cover_url || shop.logo_url;

  const FeaturedPill = ({ className = "" }: { className?: string }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      Featured shop
    </span>
  );

  const Photo = ({ size }: { size: number }) =>
    picture ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={picture}
        alt={shop.name}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    ) : (
      <ShopLogo name={shop.name} url={null} size={size} />
    );

  if (variant === "forum") {
    return (
      <article
        ref={ref as React.Ref<HTMLElement>}
        className="flex gap-3 rounded-2xl border border-emerald-500/25 bg-ocean-900/40 p-4 transition-colors hover:border-emerald-500/50"
      >
        <Link href={href} onClick={() => countClick(shop.id)} className="shrink-0">
          <ShopLogo name={shop.name} url={shop.logo_url} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} onClick={() => countClick(shop.id)}>
            <h3 className="flex items-center gap-1.5 font-medium leading-snug text-white hover:text-ocean-100">
              <span className="truncate">{shop.name}</span>
              <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Claimed by the owner" />
            </h3>
          </Link>
          <p className="mt-1 text-xs text-ocean-500">
            <span className="font-semibold uppercase tracking-wide text-emerald-300">Featured shop</span>
            {` · Local fish store${town ? ` in ${town}` : ""} · ${mi}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Stars rating={shop.rating_avg} count={shop.rating_count} size={12} />
            <Link
              href={href}
              onClick={() => countClick(shop.id)}
              className="inline-flex items-center gap-1.5 text-xs text-ocean-400 hover:text-ocean-200"
            >
              <Store className="h-3.5 w-3.5" /> Visit the shop
            </Link>
          </div>
        </div>
      </article>
    );
  }

  if (variant === "tile") {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onClick={() => countClick(shop.id)}
        className="group block overflow-hidden rounded-2xl border border-emerald-500/30 bg-ocean-900/50 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/60"
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900/60 to-ocean-950">
          <Photo size={72} />
          <FeaturedPill className="absolute left-2 top-2 px-2 py-0.5 text-[10px]" />
        </div>
        <div className="p-3.5">
          <p className="flex items-center gap-1 text-sm text-white">
            <span className="truncate">{shop.name}</span>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          </p>
          <p className="mt-0.5 text-sm text-emerald-300">Local fish store</p>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ocean-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{town || "Visit the shop"}</span>
          </p>
          <p className="text-[11px] text-ocean-600">{mi}</p>
        </div>
      </Link>
    );
  }

  // "card": matches the classifieds grid.
  return (
    <Link
      ref={ref as React.Ref<HTMLAnchorElement>}
      href={href}
      onClick={() => countClick(shop.id)}
      className="group relative block overflow-hidden rounded-2xl border border-emerald-500/30 bg-ocean-900/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/60"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900/60 to-ocean-950">
        <Photo size={88} />
        <FeaturedPill className="absolute left-3 top-3" />
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-1.5 font-display text-lg leading-snug text-white">
            {shop.name}
            <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Claimed by the owner" />
          </h2>
        </div>
        <p className="mb-4 text-sm text-ocean-400">
          Local fish store. Stop in for livestock, plants and gear.
        </p>
        <div className="flex items-center justify-between gap-3 text-xs text-ocean-500">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{town}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2.5">
            <Stars rating={shop.rating_avg} count={shop.rating_count} size={11} showCount={false} />
            <span>{mi}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
