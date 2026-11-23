"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapPin, Store } from "lucide-react";
import ShopLogo from "@/components/stores/ShopLogo";
import Stars from "@/components/stores/Stars";
import { createClient } from "@/lib/supabase/client";
import type { ClaimedShop as NearbyShop } from "@/lib/stores/claimedNearby";
import { milesLabel } from "@/lib/stores/miles";
import { thumb } from "@/lib/images/thumb";

/*
 * A local fish store mixed in among classified ads, forum threads and the
 * tools: plain, useful local information, never an ad. Which area it's for:
 * the page's own area when it has one (browsing Sacramento shows Sacramento
 * shops), otherwise the visitor's rough location from their connection, so
 * nobody is asked for their location.
 *
 * It keeps the slowly turning rainbow border so it stands out, but there is
 * no "verified" badge: any nearby shop can be the one shown.
 *
 * Rotation: the server sends the closest shops in the area; the browser
 * shuffles them once per page view, so each visit shows different local
 * shops instead of the same one every time. Views are still counted per
 * shop (once per browser per day) for the owner's Monday report.
 */

const POOL = 12;
const cache = new Map<string, Promise<NearbyShop[]>>();

/** One fetch per page and place, shuffled once, shared by every card on the page. */
function loadShops(lat?: number | null, lng?: number | null): Promise<NearbyShop[]> {
  const where = lat != null && lng != null ? `lat=${lat}&lng=${lng}&` : "";
  const key = where || "visitor";
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/api/stores/claimed-near?${where}limit=${POOL}`)
      .then((r) => (r.ok ? r.json() : { shops: [] }))
      .then((d: { shops?: NearbyShop[] }) => shuffle(d.shops ?? []))
      .catch(() => []);
    cache.set(key, p);
  }
  return p;
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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

// A slowly turning rainbow border: the shop card's highlight.
const RAINBOW =
  "bg-[conic-gradient(from_0deg,#ff2d55,#ff9500,#ffd60a,#30d158,#0ac8ff,#5e5ce6,#bf5af2,#ff2d55)]";
const SPIN = "animate-[spin_6s_linear_infinite] motion-reduce:animate-none";

/**
 * A 2px rainbow border that slowly circles the card. The gradient is a big
 * square spinning behind the card; the card's own background covers all but
 * the edge.
 */
function RgbFrame({
  frameRef,
  className = "",
  children,
}: {
  frameRef: React.Ref<HTMLDivElement>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={frameRef}
      className={`relative overflow-hidden rounded-2xl p-[2px] shadow-[0_0_22px_-8px_rgba(94,92,230,0.55)] ${className}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-1/2 -ml-[150%] -mt-[150%] aspect-square w-[300%] ${RAINBOW} ${SPIN}`}
      />
      <div className="relative h-full rounded-[14px] bg-ocean-950">{children}</div>
    </div>
  );
}

/** Within this, a shop is "local"; past it we say "nearest" so it stays honest. */
const LOCAL_MILES = 40;

function place(s: NearbyShop) {
  const town = [s.city, s.state].filter(Boolean).join(", ");
  const local = s.miles <= LOCAL_MILES;
  return { town, mi: milesLabel(s.miles), local, kind: local ? "Local fish store" : "Nearest fish store" };
}

export default function FeaturedShopCard({
  slot,
  variant,
  lat,
  lng,
  lead = "Need supplies?",
}: {
  /** Which shop of the shuffled local set this spot shows (0, 1, 2...). */
  slot: number;
  /** "tile" = homepage ads, "card" = classifieds grid, "forum" = thread row, "feed" = feed post, "strip" = one line on tools. */
  variant: "tile" | "card" | "forum" | "feed" | "strip";
  /** For "strip": the short question before the shop, fitted to the page. */
  lead?: string;
  /** The page's own area (an ad's or a classifieds area's). Leave out for the visitor's rough location. */
  lat?: number | null;
  lng?: number | null;
}) {
  const [shop, setShop] = useState<NearbyShop | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

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
  const { town, mi, kind } = place(shop);
  const picture = shop.cover_url || shop.logo_url;
  const go = () => countClick(shop.id);

  const Tag = () => (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
      <Store className="h-3 w-3" /> {kind}
    </span>
  );

  const Picture = ({ size }: { size: number }) =>
    picture ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumb(picture, 640)}
        alt={shop.name}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    ) : (
      <ShopLogo name={shop.name} url={null} size={size} />
    );

  if (variant === "strip") {
    return (
      <RgbFrame frameRef={ref}>
        <Link
          href={href}
          onClick={go}
          className="group flex items-center gap-3 rounded-[14px] bg-ocean-900/40 px-3.5 py-2.5"
        >
          <ShopLogo name={shop.name} url={shop.logo_url} size={30} />
          <span className="min-w-0 flex-1 text-sm">
            <span className="text-ocean-300">{lead} </span>
            <span className="font-semibold text-white group-hover:underline">{shop.name}</span>
            <span className="text-ocean-400">{` · ${town ? `${town} · ` : ""}${mi}`}</span>
          </span>
        </Link>
      </RgbFrame>
    );
  }

  if (variant === "feed" || variant === "forum") {
    return (
      <RgbFrame frameRef={ref}>
        <article className="flex gap-3 rounded-[14px] bg-ocean-900/40 p-4">
          <Link href={href} onClick={go} className="shrink-0">
            <ShopLogo name={shop.name} url={shop.logo_url} size={44} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={href} onClick={go}>
              <h3 className="truncate font-medium leading-snug text-white hover:text-ocean-100">{shop.name}</h3>
            </Link>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ocean-500">
              <Tag />
              <span>{`${town ? `${town} · ` : ""}${mi}`}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Stars rating={shop.rating_avg} count={shop.rating_count} size={12} />
              <Link href={href} onClick={go} className="inline-flex items-center gap-1.5 text-xs text-ocean-400 hover:text-ocean-200">
                <Store className="h-3.5 w-3.5" /> Hours, directions and reviews
              </Link>
            </div>
          </div>
        </article>
      </RgbFrame>
    );
  }

  if (variant === "tile") {
    return (
      <RgbFrame frameRef={ref} className="h-full">
        <Link
          href={href}
          onClick={go}
          className="group block h-full overflow-hidden rounded-[14px] bg-ocean-900/50"
        >
          <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900/50 to-ocean-950">
            <Picture size={72} />
            <span className="absolute left-2 top-2">
              <Tag />
            </span>
          </div>
          <div className="p-3.5">
            <p className="truncate text-sm text-white">{shop.name}</p>
            <div className="mt-1">
              <Stars rating={shop.rating_avg} count={shop.rating_count} size={11} />
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ocean-500">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{town || "Visit the shop"}</span>
            </p>
            <p className="text-[11px] text-ocean-600">{mi}</p>
          </div>
        </Link>
      </RgbFrame>
    );
  }

  // "card": matches the classifieds grid.
  return (
    <RgbFrame frameRef={ref} className="h-full">
      <Link
        href={href}
        onClick={go}
        className="group relative block h-full overflow-hidden rounded-[14px] bg-ocean-900/60"
      >
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900/50 to-ocean-950">
          <Picture size={88} />
          <span className="absolute left-3 top-3">
            <Tag />
          </span>
        </div>
        <div className="p-5">
          <h2 className="mb-2 font-display text-lg leading-snug text-white">{shop.name}</h2>
          <p className="mb-4 text-sm text-ocean-400">Livestock, plants and gear. Hours, directions and reviews on its page.</p>
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
    </RgbFrame>
  );
}
