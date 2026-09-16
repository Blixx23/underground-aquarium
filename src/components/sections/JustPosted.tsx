import Link from "next/link";
import { Fish, MapPin, ArrowRight, Plus } from "lucide-react";
import { categoryLabel } from "@/lib/marketplace/categories";
import {
  formatPrice,
  timeAgo,
  listingHref,
  type Listing,
} from "@/lib/marketplace/listings";
import { POST_AD_PATH } from "@/lib/config";

export default function JustPosted({
  listings,
  regionNames,
}: {
  listings: Listing[];
  /** "CA/sacramento" -> "Sacramento" */
  regionNames: Map<string, string>;
}) {
  const now = Date.now();

  return (
    <section className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-ocean-900 via-ocean-950 to-brine-900/30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ocean-600/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-mono tracking-[0.25em] text-ocean-500 uppercase mb-4">
              Live right now
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-white">
              Just posted
            </h2>
          </div>
          <Link
            href="/marketplace"
            className="group inline-flex items-center gap-2 text-sm text-ocean-300 hover:text-white transition-colors"
          >
            Browse everything
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-800/60 py-16 text-center">
            <Fish className="w-10 h-10 text-ocean-700 mx-auto mb-4" />
            <p className="text-ocean-200 text-lg mb-1">
              Nothing posted yet
            </p>
            <p className="text-ocean-500 text-sm mb-6 max-w-sm mx-auto">
              Somebody has to go first. Spare fry, a trimmed stem, a tank in the
              garage — it all counts.
            </p>
            <Link
              href={POST_AD_PATH}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post the first one
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {listings.map((l) => {
              const image = l.images?.[0];
              const region = regionNames.get(`${l.state_code}/${l.region_slug}`);
              return (
                <Link
                  key={l.id}
                  href={listingHref(l.slug)}
                  className="group block overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/50 transition-all duration-300 hover:-translate-y-1 hover:border-ocean-500/70"
                >
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-ocean-800 to-ocean-950">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={l.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Fish className="w-10 h-10 text-ocean-700" />
                    )}
                    {l.is_wanted ? (
                      <span className="absolute left-2 top-2 rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                        Wanted
                      </span>
                    ) : (
                      l.is_free && (
                        <span className="absolute left-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                          Free
                        </span>
                      )
                    )}
                  </div>

                  <div className="p-3.5">
                    <p className="truncate text-sm text-white group-hover:text-ocean-100 transition-colors">
                      {l.title}
                    </p>
                    <p className="mt-0.5 text-sm text-ocean-300">
                      {l.is_wanted ? "Wanted" : formatPrice(l.price_cents)}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ocean-500">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {l.city || region || categoryLabel(l.category)}
                      </span>
                    </p>
                    <p className="text-[11px] text-ocean-600">
                      {timeAgo(l.bumped_at, now)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
