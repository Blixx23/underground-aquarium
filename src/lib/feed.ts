/**
 * The feed: posts people write, plus activity the site already knows
 * about (new tanks, listings, approved spawns, badges). Everything comes
 * from public.get_feed, which applies the rules; this file only types it.
 */

export type FeedKind = "post" | "tank" | "listing" | "spawn" | "badge" | "thread";
export type FeedScope = "everyone" | "following" | "user";

export type FeedItem = {
  kind: FeedKind;
  id: string;
  user_id: string;
  created_at: string;
  body: string | null;
  images: string[];
  title: string | null;
  href: string | null;
  meta: Record<string, unknown>;
  like_count: number;
  comment_count: number;
  liked: boolean;
  author_username: string | null;
  author_name: string;
  author_avatar: string | null;
  author_society: boolean;
};

export type FeedComment = {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author_username: string | null;
  author_name: string;
  author_avatar: string | null;
  author_society: boolean;
  like_count: number;
  liked: boolean;
};

export type FeedLiker = {
  user_id: string;
  username: string | null;
  name: string;
  avatar: string | null;
  society: boolean;
  liked_at: string;
};

export const FEED_PAGE = 20;

/** What each kind is called in a sentence ("liked your tank"). */
export const FEED_NOUN: Record<FeedKind, string> = {
  post: "post",
  tank: "tank",
  listing: "listing",
  spawn: "spawn",
  badge: "trophy",
  thread: "discussion",
};

/** Kinds people can comment on inside the feed. Discussions reply in the forum. */
export function canCommentInFeed(kind: FeedKind): boolean {
  return kind !== "thread";
}

/** The page a feed item lives on, for sharing. */
export function feedItemPath(item: Pick<FeedItem, "kind" | "id" | "href">): string {
  if (item.kind === "post") return `/feed/${item.id}`;
  return item.href ?? "/feed";
}

/** Minimal shape both the server and browser Supabase clients share. */
type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function fetchFeed(
  supabase: RpcClient,
  opts: { scope: FeedScope; userId?: string | null; before?: string | null; limit?: number }
): Promise<{ items: FeedItem[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_feed", {
    p_scope: opts.scope,
    p_user: opts.userId ?? null,
    p_before: opts.before ?? null,
    p_limit: opts.limit ?? FEED_PAGE,
  });
  const items = ((data as FeedItem[] | null) ?? []).map((i) => ({
    ...i,
    images: i.images ?? [],
    meta: (i.meta as Record<string, unknown>) ?? {},
  }));
  return { items, error: error?.message ?? null };
}

/** "just now", "5m", "3h", "2d", then a date. */
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}
