"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type ViewerPhoto = { url: string; caption?: string | null };

/**
 * Full-screen photo viewer: tap a photo, swipe or arrow through the rest,
 * Esc or the X to close. Used by shop posts and the shop's Photos tab.
 */
export default function PhotoViewer({
  photos,
  index,
  onChange,
  onClose,
}: {
  photos: ViewerPhoto[];
  index: number | null;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const touchX = useRef<number | null>(null);
  const open = index != null && photos.length > 0;
  const i = index ?? 0;

  const go = useCallback(
    (step: number) => {
      if (!photos.length) return;
      onChange((i + step + photos.length) % photos.length);
    },
    [i, photos.length, onChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, go, onClose]);

  if (!open) return null;
  const photo = photos[i];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[80] flex flex-col bg-black/95"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem_+_env(safe-area-inset-top))] pb-2 text-sm text-ocean-200">
        <span>
          {photos.length > 1 ? `${i + 1} of ${photos.length}` : ""}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption ?? ""}
          className="max-h-full max-w-full select-none object-contain"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:block"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:block"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="min-h-[3rem] px-4 pt-2 pb-[calc(1rem_+_env(safe-area-inset-bottom))] text-center text-sm text-ocean-200">
        {photo.caption}
      </div>
    </div>
  );
}
