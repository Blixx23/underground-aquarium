"use client";

import { useState } from "react";
import Link from "next/link";
import PhotoViewer from "./PhotoViewer";

export type GridPhoto = { url: string; caption?: string | null };

/**
 * The shop's photos as a tidy square grid that opens the full-screen viewer.
 * With `limit` it becomes the small "Photos" card on the side of the page,
 * with a "See all" link to the Photos tab.
 */
export default function ShopPhotoGrid({
  photos,
  limit,
  seeAllHref,
  storeName,
}: {
  photos: GridPhoto[];
  limit?: number;
  seeAllHref?: string;
  storeName: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const shown = limit ? photos.slice(0, limit) : photos;
  if (photos.length === 0) return null;

  return (
    <>
      <div className={`grid gap-1 ${limit ? "grid-cols-3 overflow-hidden rounded-xl" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
        {shown.map((p, i) => (
          <button
            key={`${p.url}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            className={`group relative block aspect-square overflow-hidden bg-ocean-950 ${limit ? "" : "rounded-lg"}`}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption || `Photo from ${storeName}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>
      {limit && seeAllHref && photos.length > limit && (
        <Link href={seeAllHref} scroll={false} className="mt-3 block text-center text-sm text-emerald-300 hover:text-emerald-200">
          See all {photos.length} photos
        </Link>
      )}
      <PhotoViewer photos={photos} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
    </>
  );
}
