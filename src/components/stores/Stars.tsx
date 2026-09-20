import { Star } from "lucide-react";

/**
 * Five stars, always. The gold fills left to right in proportion to the
 * rating, so a 4.3 reads as four full stars and a sliver of the fifth.
 * With no reviews the row stays, dimmed, so every card lines up the same.
 */
export default function Stars({
  rating,
  count,
  size = 14,
  showCount = true,
  className = "",
}: {
  rating: number | null;
  count?: number;
  size?: number;
  showCount?: boolean;
  className?: string;
}) {
  const has = rating != null && (count ?? 1) > 0;
  const pct = has ? Math.max(0, Math.min(100, (rating! / 5) * 100)) : 0;
  const label = has
    ? `Rated ${rating!.toFixed(1)} out of 5${count ? ` from ${count} review${count === 1 ? "" : "s"}` : ""}`
    : "No reviews yet";

  const row = (filled: boolean) =>
    [0, 1, 2, 3, 4].map((i) => (
      <Star
        key={i}
        style={{ width: size, height: size }}
        className={`shrink-0 ${filled ? "fill-current" : ""}`}
        strokeWidth={filled ? 0 : 1.5}
        aria-hidden
      />
    ));

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} role="img" aria-label={label}>
      <span className="relative inline-flex">
        <span className={`flex gap-px ${has ? "text-amber-400/30" : "text-white/20"}`}>
          {row(false)}
        </span>
        {has && (
          <span
            className="absolute inset-y-0 left-0 flex gap-px overflow-hidden text-amber-400"
            style={{ width: `${pct}%` }}
          >
            {row(true)}
          </span>
        )}
      </span>
      {showCount && has && (
        <span className="text-xs text-ocean-400">
          {rating!.toFixed(1)}
          {count ? <span className="text-ocean-500"> ({count})</span> : null}
        </span>
      )}
    </span>
  );
}
