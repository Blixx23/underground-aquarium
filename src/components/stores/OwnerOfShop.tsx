"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import { ownedShops, type OwnedShop } from "@/lib/stores/ownedShops";

/**
 * "Shop owner" tag and an "Owner of <shop>" link under a member's name, so a
 * shop owner's personal posts are never mistaken for the shop's own page.
 * Shows nothing for members who don't run a shop.
 */
export default function OwnerOfShop({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [shops, setShops] = useState<OwnedShop[] | null>(null);
  useEffect(() => {
    let live = true;
    ownedShops(userId).then((s) => live && setShops(s));
    return () => {
      live = false;
    };
  }, [userId]);
  if (!shops || shops.length === 0) return null;
  const first = shops[0];
  return (
    <Link
      href={`/stores/${first.slug}`}
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 transition-colors hover:bg-emerald-500/20 ${
        compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]"
      }`}
      title={`Shop owner. Visit ${first.name}'s shop page`}
    >
      {first.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={first.logo_url} alt="" className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 rounded-full bg-white object-cover`} />
      ) : (
        <Store className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0`} />
      )}
      <span className="truncate">
        Owner of {first.name}
        {shops.length > 1 ? ` +${shops.length - 1}` : ""}
      </span>
    </Link>
  );
}
