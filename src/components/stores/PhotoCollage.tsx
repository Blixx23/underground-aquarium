"use client";

/**
 * A post's photos, always in the same 4:3 frame so every post is the same
 * size no matter what was uploaded. Photos are never trimmed: each shows
 * whole over a blurred copy of itself. One photo shows whole, centered over a
 * soft blurred copy of itself. Two sit side by side, three get one big and
 * two small, four or more get one wide on top and three below (with "+N" on
 * the last when there are more). Tapping any photo calls onOpen.
 */
export default function PhotoCollage({
  images,
  onOpen,
  alt = "",
}: {
  images: string[];
  onOpen: (i: number) => void;
  alt?: string;
}) {
  if (images.length === 0) return null;

  const tile = (i: number, className: string, extra?: number) => (
    <button
      key={`${images[i]}-${i}`}
      type="button"
      onClick={() => onOpen(i)}
      className={`group relative block h-full w-full overflow-hidden bg-ocean-950 ${className}`}
      aria-label={`Open photo ${i + 1} of ${images.length}`}
    >
      {/* Whole photo, never trimmed, over a soft blurred copy of itself. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[i]}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[i]}
        alt={alt}
        loading="lazy"
        className="relative h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
      />
      {extra ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-display text-3xl text-white">
          +{extra}
        </span>
      ) : null}
    </button>
  );

  const frame = "aspect-[4/3] w-full overflow-hidden";

  if (images.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        className={`relative block bg-ocean-950 ${frame}`}
        aria-label="Open photo"
      >
        {/* The same photo, blurred, fills the frame behind it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt={alt} loading="lazy" className="relative h-full w-full object-contain" />
      </button>
    );
  }

  if (images.length === 2) {
    return (
      <div className={`grid grid-cols-2 gap-0.5 ${frame}`}>
        {tile(0, "")}
        {tile(1, "")}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className={`grid grid-cols-2 grid-rows-2 gap-0.5 ${frame}`}>
        {tile(0, "row-span-2")}
        {tile(1, "")}
        {tile(2, "")}
      </div>
    );
  }

  const more = images.length - 4;
  return (
    <div className={`grid grid-cols-3 grid-rows-[2fr_1fr] gap-0.5 ${frame}`}>
      {tile(0, "col-span-3")}
      {tile(1, "")}
      {tile(2, "")}
      {tile(3, "", more > 0 ? more : undefined)}
    </div>
  );
}
