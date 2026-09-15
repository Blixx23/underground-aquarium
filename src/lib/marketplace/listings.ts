export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  is_free: boolean;
  is_wanted: boolean;
  condition: string | null;
  city: string | null;
  images: string[] | null;
  state_code: string;
  region_slug: string;
  views: number;
  bumped_at: string;
  created_at: string;
};

/** The columns every browse query needs. Keep in one place so they can't drift. */
export const LISTING_COLUMNS =
  "id, slug, title, description, category, price_cents, is_free, is_wanted, condition, city, images, state_code, region_slug, views, bumped_at, created_at";

/**
 * How a price reads on a card.
 *   null  -> "Contact for price"
 *   0     -> "Free"
 *   2500  -> "$25"
 *   2599  -> "$25.99"
 */
export function formatPrice(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "Contact for price";
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}

export const CONDITIONS = [
  { key: "new", label: "New" },
  { key: "like-new", label: "Like new" },
  { key: "good", label: "Good" },
  { key: "fair", label: "Fair" },
  { key: "for-parts", label: "For parts" },
] as const;

export function conditionLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return CONDITIONS.find((c) => c.key === key)?.label ?? null;
}

/** "3 hours ago", "2 days ago" — deterministic, no locale surprises. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}

export function listingHref(slug: string): string {
  return `/listing/${slug}`;
}
