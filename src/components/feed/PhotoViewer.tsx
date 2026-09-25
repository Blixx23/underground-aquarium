"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Full-screen photo viewer: arrows or swipe to move between photos,
 * Escape or tap outside to close. Replaces opening the raw image file.
 */
export default function PhotoViewer({
  images,
  start = 0,
  onClose,
}: {
  images: string[];
  start?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const touchX = useRef<number | null>(null);
  const n = images.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % n);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + n) % n);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [n, onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50 && n > 1) setI((x) => (dx < 0 ? (x + 1) % n : (x - 1 + n) % n));
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[i]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[100dvh] max-w-full select-none object-contain"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </button>
      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              setI((x) => (x - 1 + n) % n);
            }}
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              setI((x) => (x + 1) % n);
            }}
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, j) => (
              <span key={j} className={`h-1.5 w-1.5 rounded-full ${j === i ? "bg-white" : "bg-white/35"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
