import { supabasePublic } from "@/lib/supabase/public";

export type FeedItem = {
  feed_type: "tank" | "thread";
  id: string;
  author_id: string | null;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  href: string;
  created_at: string;
  meta: string | null;
  op_post_id: string | null;
  authorName: string;
  authorUsername: string | null;
};

type FeedRow = Omit<FeedItem, "authorName" | "authorUsername">;

export async function getFeedPage(
  offset: number,
  limit: number
): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const { data } = await supabasePublic
    .from("community_feed")
    .select(
      "feed_type, id, author_id, title, excerpt, image_url, like_count, comment_count, href, created_at, meta, op_post_id"
    )
    // created_at is the feed order; id breaks ties (e.g. seeded posts share a
    // timestamp) so paging stays stable.
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  const rows = (data ?? []) as FeedRow[];

  // Resolve author display names in one query.
  const authorIds = Array.from(
    new Set(rows.map((r) => r.author_id).filter((x): x is string => Boolean(x)))
  );
  const nameById = new Map<string, { username: string | null; full: string | null }>();
  if (authorIds.length > 0) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id, username, full_name")
      .in("id", authorIds);
    for (const p of profs ?? []) {
      nameById.set(p.id as string, {
        username: (p.username as string) ?? null,
        full: (p.full_name as string) ?? null,
      });
    }
  }

  const items: FeedItem[] = rows.map((r) => {
    const n = r.author_id ? nameById.get(r.author_id) : undefined;
    return {
      ...r,
      like_count: r.like_count ?? 0,
      comment_count: r.comment_count ?? 0,
      authorName: n?.full || n?.username || "An aquarist",
      authorUsername: n?.username ?? null,
    };
  });

  return { items, hasMore: rows.length === limit };
}
