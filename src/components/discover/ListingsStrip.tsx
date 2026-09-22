import Link from "next/link";
import { Fish, Plus, ArrowRight } from "lucide-react";
import { formatPrice, listingHref, type Listing } from "@/lib/marketplace/listings";
import { POST_AD_PATH } from "@/lib/config";

/** Live ads for what the reader is looking at, or an invite to list one. */
export default function ListingsStrip({
  listings,
  name,
  browseHref,
}: {
  listings: Listing[];
  name: string;
  browseHref: string;
}) {
  return (
    <section className="mt-10 border-t border-white/10 pt-8">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl text-white">
          <Fish className="h-5 w-5 text-emerald-300" /> {name} for sale
        </h2>
        <Link href={browseHref} className="shrink-0 text-sm text-ocean-400 hover:text-white">
          Browse all →
        </Link>
      </div>

      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={listingHref(l.slug)}
              className="group overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40 transition-colors hover:border-ocean-600"
            >
              <div className="aspect-square overflow-hidden bg-ocean-950">
                {l.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.images[0]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center">
                    <Fish className="h-7 w-7 text-ocean-700" />
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-sm font-medium text-white">{l.title}</p>
                <p className="text-xs text-emerald-300">{l.is_free ? "Free" : formatPrice(l.price_cents)}</p>
                {l.city && <p className="line-clamp-1 text-[11px] text-ocean-500">{l.city}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.06] p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-emerald-50/80">
            No {name.toLowerCase()} listed right now. Breeding them or have extras? Live fish are welcome and
            posting is free.
          </p>
          <div className="flex shrink-0 gap-2">
            <Link
              href={POST_AD_PATH}
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" /> Sell yours
            </Link>
            <Link
              href="/aquarium-stores"
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-emerald-400/30 px-4 text-sm text-emerald-100 hover:bg-emerald-400/10"
            >
              Find a shop <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
