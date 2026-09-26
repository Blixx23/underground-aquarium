"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";

export type SpeciesPhoto = {
  id: string;
  url: string;
  width: number;
  height: number;
  caption: string | null;
  is_cover: boolean;
  username: string | null;
  full_name: string | null;
};

/**
 * Member photos of a species, cover first. Tap a thumbnail to bring it
 * up top. Every photo carries the name of the member who took it.
 */
export default function SpeciesPhotos({ photos, name }: { photos: SpeciesPhoto[]; name: string }) {
  const [active, setActive] = useState(0);
  if (photos.length === 0) return null;

  const p = photos[Math.min(active, photos.length - 1)];
  const who = p.full_name || p.username || "a member";

  return (
    <figure className="mb-8">
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-2xl border border-white/10 bg-ocean-950/60"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.url}
          alt={p.caption ? `${name}: ${p.caption}` : `${name} in a member's tank`}
          width={p.width}
          height={p.height}
          className="max-h-[520px] w-full object-contain"
        />
      </a>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ocean-400">
        <Camera className="h-4 w-4 text-ocean-500" />
        <span>
          Photo by{" "}
          {p.username ? (
            <Link href={`/u/${p.username}`} className="text-emerald-300 hover:text-emerald-200">
              {who}
            </Link>
          ) : (
            <span className="text-ocean-200">{who}</span>
          )}
        </span>
        {p.caption && <span className="text-ocean-500">· {p.caption}</span>}
      </figcaption>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((ph, i) => (
            <button
              key={ph.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border transition-colors ${
                i === active ? "border-emerald-400" : "border-white/10 opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
