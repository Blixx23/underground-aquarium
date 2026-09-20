"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Expand } from "lucide-react";

/**
 * The tank's photos, made to be looked at: a big cover image, a strip of
 * thumbnails under it, and a full-screen viewer that swipes on a phone and
 * takes arrow keys on a computer.
 */
export default function TankGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback(
    (d: number) => setActive((i) => (i + d + count) % count),
    [count]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go]);

  if (count === 0) return null;

  const swipeStart = (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX);
  const swipeEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const arrow = (d: number, big = false) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        go(d);
      }}
      aria-label={d < 0 ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 -translate-y-1/2 ${d < 0 ? "left-2" : "right-2"} flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70 ${
        big ? "h-12 w-12" : "h-9 w-9 opacity-0 group-hover:opacity-100 max-sm:opacity-100"
      }`}
    >
      {d < 0 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );

  return (
    <div>
      {/* The cover, big. */}
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-ocean-950 sm:aspect-[16/9]"
        onTouchStart={swipeStart}
        onTouchEnd={swipeEnd}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block h-full w-full cursor-zoom-in"
          aria-label="View full screen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={`${name}, photo ${active + 1} of ${count}`}
            className="h-full w-full object-cover"
          />
        </button>
        {count > 1 && arrow(-1)}
        {count > 1 && arrow(1)}
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur">
          <Expand className="h-3 w-3" />
          {count > 1 ? `${active + 1} / ${count}` : "View"}
        </span>
      </div>

      {/* Thumbnails. */}
      {count > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-20 sm:w-28 ${
                i === active ? "border-emerald-400" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Full screen. */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          role="dialog"
          aria-label={`${name} photos`}
          onClick={() => setOpen(false)}
          onTouchStart={swipeStart}
          onTouchEnd={swipeEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={`${name}, photo ${active + 1} of ${count}`}
            className="max-h-[92vh] max-w-[96vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {count > 1 && arrow(-1, true)}
          {count > 1 && arrow(1, true)}
          {count > 1 && (
            <span className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
              {active + 1} / {count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
