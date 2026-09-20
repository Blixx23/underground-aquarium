import Link from "next/link";
import { Globe, Lock, Images, Waves } from "lucide-react";
import { blurb } from "@/lib/tanks/showcase";

export type TankTileData = {
  id: string;
  name: string | null;
  gallons: number | null;
  items: unknown[] | null;
  images: string[] | null;
  description?: string | null;
  is_public?: boolean;
};

/**
 * A tank as a photo tile: the cover picture fills the card, the name and a
 * line or two of description sit underneath. Used on your own profile, on
 * other people's, and anywhere else tanks are listed.
 */
export default function TankTile({
  tank,
  showVisibility = false,
}: {
  tank: TankTileData;
  showVisibility?: boolean;
}) {
  const cover = tank.images?.[0];
  const photos = tank.images?.length ?? 0;
  const species = Array.isArray(tank.items) ? tank.items.length : 0;
  const text = blurb(tank.description ?? null);
  const facts = [tank.gallons ? `${tank.gallons} gal` : null, `${species} species`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/tanks/${tank.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-colors hover:border-emerald-500/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ocean-950">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={tank.name ?? "Tank"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-ocean-900 to-ocean-950">
            <Waves className="h-8 w-8 text-ocean-700" />
            {showVisibility && <span className="text-xs text-ocean-500">Add a photo</span>}
          </div>
        )}

        {/* Small overlays: private/public for your own, photo count for everyone. */}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          {showVisibility ? (
            tank.is_public ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300 backdrop-blur">
                <Globe className="h-2.5 w-2.5" /> Posted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ocean-200 backdrop-blur">
                <Lock className="h-2.5 w-2.5" /> Private
              </span>
            )
          ) : (
            <span />
          )}
          {photos > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white backdrop-blur">
              <Images className="h-3 w-3" /> {photos}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="truncate font-display text-lg leading-tight text-white">
          {tank.name || "Untitled tank"}
        </p>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-ocean-400">{facts}</p>
        {text && <p className="mt-2 line-clamp-2 text-sm leading-snug text-ocean-300">{text}</p>}
      </div>
    </Link>
  );
}
