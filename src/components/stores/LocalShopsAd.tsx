"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronRight, Sparkles } from "lucide-react";
import ShopLogo from "@/components/stores/ShopLogo";
import Stars from "@/components/stores/Stars";
import { createClient } from "@/lib/supabase/client";
import type { ClaimedShop } from "@/lib/stores/claimedNearby";

/**
 * "Featured fish stores": the nearest claimed shops, shown on classified ads
 * and forum threads like a sponsor spot. Free for now; built so the spot can
 * be sold later. Each time a shop is actually seen it's counted (once per
 * browser per shop per day), and the owner hears about it in their weekly
 * report: "seen by X people this week".
 */
export default function LocalShopsAd({
  lat,
  lng,
  placement,
  className = "",
}: {
  /** An ad's region. Leave out to use the visitor's rough location. */
  lat?: number | null;
  lng?: number | null;
  /** The narrow ad sidebar stacks the shops; forum threads lay them side by side. */
  placement: "listing" | "forum";
  className?: string;
}) {
  const [shops, setShops] = useState<ClaimedShop[] | null>(null);
  const boxRef = useRef<HTMLElement | null>(null);

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

  // Count a "seen" only once the box is at least half on screen, so a shop's
  // number means real eyes, not a page that loaded and was never scrolled to.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || !shops || shops.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        const today = new Date().toISOString().slice(0, 10);
        const supabase = createClient();
        for (const s of shops) {
          try {
            const key = `ua-featured-${s.id}`;
            if (localStorage.getItem(key) === today) continue;
            localStorage.setItem(key, today);
          } catch {
            /* private browsing: count it anyway */
          }
          supabase.rpc("record_store_event", { p_store: s.id, p_kind: "featured" });
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shops]);

  if (!shops || shops.length === 0) return null;

  const stacked = placement === "listing";
  const allFar = shops.every((s) => s.miles > 60);

  return (
    <section
      ref={boxRef}
      aria-label="Featured fish stores"
      className={`relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-ocean-900/60 to-ocean-950/80 p-5 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Featured fish stores
          </p>
          <h2 className="font-display text-lg leading-tight text-white">
            {allFar ? "Shops on Underground Aquarium" : "Local shops near you"}
          </h2>
        </div>
        <Link href="/stores" className="shrink-0 pt-1 text-xs text-ocean-400 transition-colors hover:text-white">
          All shops
        </Link>
      </div>

      <div className={stacked ? "space-y-2.5" : "grid grid-cols-1 gap-3 sm:grid-cols-3"}>
        {shops.map((s) => (
          <Link
            key={s.id}
            href={`/stores/${s.slug}`}
            onClick={() => {
              createClient().rpc("record_store_event", { p_store: s.id, p_kind: "featured_click" });
            }}
            className="group flex items-center gap-3 rounded-xl border border-ocean-800/60 bg-ocean-950/60 p-3 transition-colors hover:border-emerald-500/50"
          >
            <ShopLogo name={s.name} url={s.logo_url} size={48} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-medium text-white">
                <span className="truncate">{s.name}</span>
                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Claimed by the owner" />
              </p>
              <p className="truncate text-xs text-ocean-400">
                {[s.city, s.state].filter(Boolean).join(", ")}
                {` · ${s.miles < 1 ? "under 1" : Math.round(s.miles).toLocaleString("en-US")} mi`}
              </p>
              <Stars rating={s.rating_avg} count={s.rating_count} size={12} className="mt-1" />
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-ocean-600 transition-colors group-hover:text-emerald-300" />
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs text-ocean-400">
        Own a fish store?{" "}
        <Link href="/stores" className="font-medium text-emerald-300 underline-offset-2 hover:underline">
          Claim your free shop page
        </Link>{" "}
        and get featured here.
      </p>
    </section>
  );
}
