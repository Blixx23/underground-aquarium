import type { FeedItem } from "@/lib/feed";

/**
 * How a single feed post presents itself to search engines. Shared by the
 * post page and the sitemap so both agree on which posts are worth indexing.
 */

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** A title from the post's own words, e.g. "My 40 breeder finally cycled…". */
export function postTitle(item: Pick<FeedItem, "body" | "author_name" | "images">): string {
  const body = clean(item.body);
  if (!body) {
    return item.images.length > 0 ? `Tank photos from ${item.author_name}` : `Post by ${item.author_name}`;
  }
  // First sentence if it's short enough, else a word-boundary cut.
  const first = body.split(/(?<=[.!?])\s/)[0];
  const base = first.length <= 70 ? first : body.slice(0, 67).replace(/\s+\S*$/, "") + "…";
  return base.replace(/[.!]$/, "");
}

/** Short or empty posts ("nice!") stay out of Google; real ones go in. */
export function postIndexable(item: { body: string | null; images?: string[] | null; comment_count?: number | null }): boolean {
  const len = clean(item.body).length;
  const photos = (item.images ?? []).length;
  return len >= 80 || (photos > 0 && len >= 20) || (len >= 20 && (item.comment_count ?? 0) >= 2);
}
