"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Store, Fish } from "lucide-react";
import { CATEGORIES, categoryLabel } from "@/lib/marketplace/categories";

export type ShopItem = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  images: string[] | null;
  category: string | null;
  stock: number | null;
};

export default function ProfileShop({
  items,
  storeSlug,
}: {
  items: ShopItem[];
  storeSlug: string | null;
}) {
  const [active, setActive] = useState("all");

  // Sold-out items (stock 0) don't show, matching the marketplace.
  const available = useMemo(() => items.filter((i) => i.stock !== 0), [items]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of available) {
      const k = i.category ?? "other";
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [available]);

  const pills = useMemo(
    () => CATEGORIES.filter((c) => (counts[c.key] ?? 0) > 0),
    [counts]
  );

  const filtered = useMemo(
    () =>
      active === "all"
        ? available
        : available.filter((i) => (i.category ?? "other") === active),
    [available, active]
  );

  if (available.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-emerald-400">
          <Store className="h-5 w-5" /> Shop
        </h2>
        {storeSlug && (
          <Link
            href={`/shop/${storeSlug}`}
            className="shrink-0 text-sm text-ocean-300 transition-colors hover:text-white"
          >
            View full shop →
          </Link>
        )}
      </div>

      {pills.length > 1 && (
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2">
          <button
            onClick={() => setActive("all")}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              active === "all"
                ? "border-ocean-500 bg-ocean-600 text-white"
                : "border-white/10 bg-white/5 text-ocean-300 hover:border-ocean-600/70 hover:text-white"
            }`}
          >
            All {available.length}
          </button>
          {pills.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                active === c.key
                  ? "border-ocean-500 bg-ocean-600 text-white"
                  : "border-white/10 bg-white/5 text-ocean-300 hover:border-ocean-600/70 hover:text-white"
              }`}
            >
              {c.label} {counts[c.key]}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => {
          const image = item.images?.[0];
          return (
            <Link
              key={item.id}
              href={`/marketplace/${item.slug}`}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-emerald-500/40 hover:bg-white/10"
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-ocean-800 to-ocean-950">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <Fish className="h-8 w-8 text-ocean-700" />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm text-white transition-colors group-hover:text-emerald-300">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs text-ocean-300">
                  ${Number(item.price).toFixed(2)}
                  <span className="text-ocean-500">
                    {" "}
                    · {categoryLabel(item.category)}
                  </span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
