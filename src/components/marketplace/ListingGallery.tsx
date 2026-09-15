"use client";

import { useEffect, useMemo, useState } from "react";
import { Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ListingGallery({
  listingId,
  images,
  title,
  countView,
}: {
  listingId: string;
  images: string[];
  title: string;
  /** False when the viewer owns the listing — don't inflate their own count. */
  countView: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!countView) return;

    // One view per listing per browser session. Without this, every
    // back-navigation would bump the counter again.
    const key = `ua:viewed:${listingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked — counting once per page load is still fine.
    }

    supabase.rpc("increment_listing_views", { p_listing_id: listingId });
  }, [supabase, listingId, countView]);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-ocean-800 to-ocean-950 border border-ocean-800/60 flex items-center justify-center">
        <Fish className="w-16 h-16 text-ocean-700" />
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-ocean-950 border border-ocean-800/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`${title} — photo ${index + 1} of ${images.length}`}
          className="w-full h-full object-contain"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border transition-colors ${
                i === index
                  ? "border-ocean-400"
                  : "border-ocean-800/60 hover:border-ocean-600"
              }`}
              aria-label={`Show photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
