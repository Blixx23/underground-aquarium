"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Award, MapPin, Store } from "lucide-react";
import ShopLogo from "@/components/stores/ShopLogo";
import Stars from "@/components/stores/Stars";
import { createClient } from "@/lib/supabase/client";
import type { ClaimedShop } from "@/lib/stores/claimedNearby";

/*
 * Verified (claimed) shops, mixed in among classified ads and forum threads.
 * Shown as something the shop earned by claiming its page, not as an ad.
 * Built so the spot can be sold later. Each shop counts a "seen" once per browser per day when its card is
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
  lead = "Need supplies?",
}: {
  /** Which featured shop this spot shows: 0 is the nearest, 1 the next, and so on. */
  slot: number;
  /** "tile" = homepage Just posted, "card" = classifieds grid, "forum" = thread row, "feed" = community feed post. */
  variant: "tile" | "card" | "forum" | "feed" | "strip";
  /** For "strip": the short question before the shop, fitted to the page. */
  lead?: string;
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

  // An earned badge, like an achievement: a medal with ribbon tails and a
  // banner reading "Verified Shop". Shops get it by claiming their page.
  const Medal = ({ size = 28 }: { size?: number }) => (
    <span className="relative inline-flex shrink-0 flex-col items-center" style={{ width: size }} aria-hidden>
      <span
        className="relative z-10 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.65)] ring-2 ring-emerald-200/70"
        style={{ width: size, height: size }}
      >
        <span className="absolute inset-[3px] rounded-full border border-white/40" />
        <Award className="text-white drop-shadow" style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.25} />
      </span>
      <span className="-mt-1 flex gap-[2px]">
        <span className="block bg-emerald-600" style={{ width: size * 0.22, height: size * 0.38, clipPath: "polygon(0 0,100% 0,100% 100%,50% 75%,0 100%)" }} />
        <span className="block bg-emerald-700" style={{ width: size * 0.22, height: size * 0.38, clipPath: "polygon(0 0,100% 0,100% 100%,50% 75%,0 100%)" }} />
      </span>
    </span>
  );

  const Ribbon = ({ small = false }: { small?: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 font-bold uppercase tracking-[0.12em] text-ocean-950 shadow-[0_2px_10px_rgba(16,185,129,0.45)] ${
        small ? "px-3 py-0.5 text-[9px]" : "px-3.5 py-1 text-[10px]"
      }`}
      style={{ clipPath: "polygon(0 0,100% 0,94% 50%,100% 100%,0 100%,6% 50%)" }}
    >
      Verified Shop
    </span>
  );

  // The achievement as it sits on a picture: medal plus banner.
  const FeaturedPill = ({ className = "", small = false }: { className?: string; small?: boolean }) => (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Medal size={small ? 24 : 30} />
      <span className="-ml-2.5 mb-2">
        <Ribbon small={small} />
      </span>
    </span>
  );

  // The shop's logo with a glowing ring and the medal pinned to it.
  const LogoWithMedal = ({ size }: { size: number }) => (
    <span className="relative inline-flex shrink-0">
      <span className="rounded-full p-[2px] bg-gradient-to-br from-emerald-300 to-emerald-700 shadow-[0_0_14px_rgba(16,185,129,0.5)]">
        <ShopLogo name={shop.name} url={shop.logo_url} size={size} />
      </span>
      <span className="absolute -bottom-2 -right-2">
        <Medal size={Math.round(size * 0.45)} />
      </span>
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

  if (variant === "strip") {
    // One slim line for busy tool pages: helpful, not in the way.
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onClick={() => countClick(shop.id)}
        className="group flex items-center gap-3 rounded-2xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/[0.08] to-ocean-900/40 px-3.5 py-2.5 shadow-[0_0_20px_-10px_rgba(16,185,129,0.6)] transition-colors hover:border-emerald-400/60"
      >
        <span className="pb-1.5 pr-1.5">
          <LogoWithMedal size={30} />
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="text-ocean-300">{lead} </span>
          <span className="font-semibold text-white group-hover:underline">{shop.name}</span>
          <span className="text-ocean-400">{` · ${town ? `${town} · ` : ""}${mi}`}</span>
        </span>
        <span className="hidden shrink-0 sm:inline-flex">
          <Ribbon small />
        </span>
      </Link>
    );
  }

  if (variant === "feed") {
    // Looks like a feed post from the shop: header, a line of text, the
    // shop's banner if it has one, and a footer row like Like/Comment/Share.
    return (
      <article
        ref={ref as React.Ref<HTMLElement>}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.07] to-ocean-900/40 font-sans shadow-[0_0_24px_-10px_rgba(16,185,129,0.6)]"
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Link href={href} onClick={() => countClick(shop.id)} className="shrink-0 pb-2 pr-2">
              <LogoWithMedal size={42} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={href}
                onClick={() => countClick(shop.id)}
                className="block truncate font-semibold text-white hover:underline"
              >
                {shop.name}
              </Link>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-ocean-400">
                <Ribbon small />
                <span>{town ? `${town} · ` : ""}{mi}</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ocean-100">
            {shop.name} is a verified local fish store on Underground Aquarium. Stop in for livestock,
            plants and gear, and leave them a review after your visit.
          </p>
        </div>
        {shop.cover_url && (
          <Link href={href} onClick={() => countClick(shop.id)} className="group block overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shop.cover_url}
              alt={`${shop.name} banner`}
              loading="lazy"
              className="max-h-80 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </Link>
        )}
        <div className="mx-3 flex items-center justify-between gap-3 border-t border-ocean-800/50 px-1 py-2.5 sm:mx-4">
          <Stars rating={shop.rating_avg} count={shop.rating_count} size={13} />
          <Link
            href={href}
            onClick={() => countClick(shop.id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-white/5"
          >
            <Store className="h-4 w-4" /> Visit the shop
          </Link>
        </div>
      </article>
    );
  }

  if (variant === "forum") {
    return (
      <article
        ref={ref as React.Ref<HTMLElement>}
        className="flex gap-3 rounded-2xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/[0.07] to-ocean-900/40 p-4 shadow-[0_0_24px_-10px_rgba(16,185,129,0.6)] transition-colors hover:border-emerald-400/60"
      >
        <Link href={href} onClick={() => countClick(shop.id)} className="shrink-0 pb-2 pr-2">
          <LogoWithMedal size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} onClick={() => countClick(shop.id)}>
            <h3 className="flex items-center gap-1.5 font-medium leading-snug text-white hover:text-ocean-100">
              <span className="truncate">{shop.name}</span>
            </h3>
          </Link>
          <p className="mt-1 text-xs text-ocean-500">
            <span className="mr-1.5 inline-block align-middle">
              <Ribbon small />
            </span>
            {`Local fish store${town ? ` in ${town}` : ""} · ${mi}`}
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
        className="group block overflow-hidden rounded-2xl border border-emerald-500/40 bg-ocean-900/50 shadow-[0_0_24px_-10px_rgba(16,185,129,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/60"
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900/60 to-ocean-950">
          <Photo size={72} />
          <FeaturedPill small className="absolute left-2 top-2" />
        </div>
        <div className="p-3.5">
          <p className="flex items-center gap-1 text-sm text-white">
            <span className="truncate">{shop.name}</span>
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
      className="group relative block overflow-hidden rounded-2xl border border-emerald-500/40 bg-ocean-900/60 shadow-[0_0_24px_-10px_rgba(16,185,129,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/60"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900/60 to-ocean-950">
        <Photo size={88} />
        <FeaturedPill className="absolute left-3 top-3" />
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-1.5 font-display text-lg leading-snug text-white">
            {shop.name}
          </h2>
        </div>
        <p className="mb-4 text-sm text-ocean-400">
          Owner-verified local fish store. Stop in for livestock, plants and gear.
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
