"use client";

/**
 * How a post's photos sit in the card, the way Facebook does it:
 * one photo shows whole, two sit side by side, three get one big and two
 * small, four or more get one wide on top and three below (with "+N" on the
 * last when there are more). Tapping any photo calls onOpen with its index.
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
      className={`group relative block overflow-hidden bg-ocean-950 ${className}`}
      aria-label={`Open photo ${i + 1} of ${images.length}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[i]}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      {extra ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-display text-3xl text-white">
          +{extra}
        </span>
      ) : null}
    </button>
  );

  if (images.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="block w-full overflow-hidden bg-black/40"
        aria-label="Open photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt={alt} loading="lazy" className="mx-auto max-h-[36rem] w-full object-contain" />
      </button>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {tile(0, "aspect-square")}
        {tile(1, "aspect-square")}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5">
        {tile(0, "row-span-2")}
        {tile(1, "")}
        {tile(2, "")}
      </div>
    );
  }

  const more = images.length - 4;
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {tile(0, "col-span-3 aspect-[16/10]")}
      {tile(1, "aspect-square")}
      {tile(2, "aspect-square")}
      {tile(3, "aspect-square", more > 0 ? more : undefined)}
    </div>
  );
}
