/**
 * A small copy of a member's photo for thumbnails. Uploads are saved at up to
 * 2000 px, which is right for the full-screen viewer but heavy for a tile. Our
 * own photos (Supabase storage) go through Vercel's image resizer, which makes
 * and caches a small copy; anything else is returned as is.
 *
 * Widths must be one of Next's sizes (128, 256, 384, 640, 828), and quality
 * must be 75, the only one Next 16 allows unless next.config lists others.
 */
export type ThumbWidth = 128 | 256 | 384 | 640 | 828;

export function thumb(url: string | null | undefined, width: ThumbWidth = 384): string {
  if (!url) return "";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//i.test(url)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}
