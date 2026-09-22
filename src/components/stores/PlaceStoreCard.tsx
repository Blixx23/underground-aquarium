import Link from "next/link";
import { MapPin, Phone, ChevronRight } from "lucide-react";
import Stars from "@/components/stores/Stars";
import type { PlaceStore } from "@/lib/stores/places";

/** One shop on a city or state page: name, stars, address, phone. */
export default function PlaceStoreCard({ s, distance }: { s: PlaceStore; distance?: number }) {
  return (
    <Link
      href={`/stores/${s.slug}`}
      className="group flex items-start gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 transition-colors hover:border-ocean-600"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug text-white group-hover:text-ocean-100">{s.name}</span>
        <Stars rating={s.rating_avg} count={s.rating_count} className="mt-1" />
        {(s.address || s.city) && (
          <span className="mt-1.5 flex items-start gap-1.5 text-sm text-ocean-300">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ocean-500" />
            <span>{s.address || `${s.city}, ${s.state}`}</span>
          </span>
        )}
        {s.phone && (
          <span className="mt-1 flex items-center gap-1.5 text-sm text-ocean-400">
            <Phone className="h-3.5 w-3.5 shrink-0 text-ocean-500" /> {s.phone}
          </span>
        )}
        {s.tags && s.tags.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1">
            {s.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-ocean-800/60 px-2 py-0.5 text-[11px] text-ocean-300">
                {t}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        {distance != null && <span className="text-xs text-ocean-400">{distance.toFixed(1)} mi</span>}
        <ChevronRight className="h-4 w-4 text-ocean-500 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
