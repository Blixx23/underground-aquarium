"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Fish, Search, X } from "lucide-react";
import { CATEGORIES, categoryLabel } from "@/lib/marketplace/categories";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  stock: number | null;
  images: string[] | null;
  category: string | null;
  created_at: string;
  shipping_price: number | string | null;
};

type SortKey = "newest" | "price_asc" | "price_desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function MarketplaceBrowser({
  products,
}: {
  products: Product[];
}) {
  const [active, setActive] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");

  // Hide sold-out listings (stock === 0) entirely; null & positive stay.
  const available = useMemo(
    () => products.filter((p) => p.stock !== 0),
    [products]
  );

  // How many listings sit in each category
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of available) {
      const k = p.category ?? "other";
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [available]);

  // Only show pills for categories that actually have listings
  const pills = useMemo(
    () => CATEGORIES.filter((c) => (counts[c.key] ?? 0) > 0),
    [counts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = available.filter((p) => {
      const k = p.category ?? "other";
      if (active !== "all" && k !== active) return false;
      if (q) {
        const hay = `${p.name} ${p.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "price_asc") return Number(a.price) - Number(b.price);
      if (sort === "price_desc") return Number(b.price) - Number(a.price);
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [available, active, sort, query]);

  return (
    <div>
      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-500 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listings…"
            className="w-full rounded-full bg-ocean-900/60 border border-ocean-800/60 pl-11 pr-10 py-2.5 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-full bg-ocean-900/60 border border-ocean-800/60 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ocean-500 transition-colors"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        <button
          onClick={() => setActive("all")}
          className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
            active === "all"
              ? "bg-ocean-600 border-ocean-500 text-white"
              : "bg-ocean-900/60 border-ocean-800/60 text-ocean-300 hover:text-white hover:border-ocean-600/70"
          }`}
        >
          All
          <span className={active === "all" ? "text-ocean-100" : "text-ocean-500"}>
            {available.length}
          </span>
        </button>
        {pills.map((c) => (
          <button
            key={c.key}
            onClick={() => setActive(c.key)}
            className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
              active === c.key
                ? "bg-ocean-600 border-ocean-500 text-white"
                : "bg-ocean-900/60 border-ocean-800/60 text-ocean-300 hover:text-white hover:border-ocean-600/70"
            }`}
          >
            {c.label}
            <span
              className={active === c.key ? "text-ocean-100" : "text-ocean-500"}
            >
              {counts[c.key]}
            </span>
          </button>
        ))}
      </div>

      <p className="text-sm text-ocean-500 mb-5">
        {filtered.length} {filtered.length === 1 ? "listing" : "listings"}
        {active !== "all" && ` in ${categoryLabel(active)}`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <p className="text-ocean-300 text-lg mb-1">Nothing matches</p>
          <p className="text-ocean-500 text-sm">
            Try another category or clear your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => {
            const image = product.images?.[0];
            const isNew =
              Date.now() - new Date(product.created_at).getTime() < WEEK_MS;
            const ship = Number(product.shipping_price);
            return (
              <Link
                key={product.id}
                href={`/marketplace/${product.slug}`}
                className="group relative block rounded-2xl overflow-hidden bg-ocean-900/60 border border-ocean-800/60 hover:border-ocean-600/70 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] bg-gradient-to-br from-ocean-800 to-ocean-950 flex items-center justify-center overflow-hidden">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <Fish className="w-12 h-12 text-ocean-700" />
                  )}
                  <span className="absolute left-3 top-3 text-[11px] font-medium uppercase tracking-wide text-ocean-100 bg-ocean-950/70 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
                    {categoryLabel(product.category)}
                  </span>
                  {isNew && (
                    <span className="absolute right-3 top-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-1">
                      New
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-display text-lg text-white leading-snug">
                      {product.name}
                    </h2>
                    <span className="shrink-0 font-display text-lg text-ocean-200">
                      ${Number(product.price).toFixed(2)}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-sm text-ocean-400 line-clamp-2 mb-4">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-ocean-500">
                    <span>
                      {ship > 0 ? `+$${ship.toFixed(2)} shipping` : "Free shipping"}
                    </span>
                    <span>
                      {typeof product.stock === "number"
                        ? `${product.stock} in stock`
                        : "In stock"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
