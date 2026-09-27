import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import FeedCard from "@/components/feed/FeedCard";
import { fetchFeed, type FeedComment } from "@/lib/feed";
import { getViewer } from "@/lib/feedViewer";
import { postIndexable, postTitle } from "@/lib/feedSeo";
import { ldJson } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";

const SITE = "https://www.undergroundaquarium.com";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPost(id: string) {
  if (!UUID.test(id)) return { post: null, viewer: null, supabase: null };
  const { viewer, supabase } = await getViewer();
  const { data } = await supabase
    .from("feed_posts")
    .select("user_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { post: null, viewer, supabase };
  // Ask the feed for this author's items up to and including this post's time.
  const after = new Date(new Date(data.created_at).getTime() + 1).toISOString();
  const { items } = await fetchFeed(supabase, { scope: "user", userId: data.user_id, before: after, limit: 50 });
  return { post: items.find((i) => i.kind === "post" && i.id === id) ?? null, viewer, supabase };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const { post } = await loadPost(id);
  if (!post) notFound();
  const title = postTitle(post);
  const body = (post.body ?? "").replace(/\s+/g, " ").trim();
  const description =
    (body.length > 158 ? `${body.slice(0, 155).trimEnd()}…` : body) ||
    `${post.author_name} shared ${post.images.length > 1 ? "photos" : "a photo"} on Underground Aquarium.`;
  return {
    title,
    description,
    alternates: { canonical: `/feed/${id}` },
    robots: { index: postIndexable(post), follow: true },
    openGraph: {
      title,
      description,
      url: `/feed/${id}`,
      type: "article",
      ...(post.images[0] ? { images: [post.images[0]] } : {}),
    },
  };
}

/** A single post, where notifications and shared links land. */
export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const { post, viewer, supabase } = await loadPost(id);
  if (!post || !supabase) notFound();

  // Comments on the server, so they're part of the page Google reads.
  const { data: commentRows } = await supabase.rpc("get_item_comments", { p_kind: "post", p_id: id });
  const comments = ((commentRows as FeedComment[] | null) ?? []).map((c) => ({
    ...c,
    like_count: c.like_count ?? 0,
    liked: Boolean(c.liked),
  }));

  const url = `${SITE}/feed/${id}`;
  const person = (name: string, username: string | null) => ({
    "@type": "Person",
    name,
    ...(username ? { url: `${SITE}/u/${username}` } : {}),
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    url,
    mainEntityOfPage: url,
    headline: postTitle(post),
    text: (post.body ?? "").trim() || postTitle(post),
    datePublished: post.created_at,
    author: person(post.author_name, post.author_username),
    ...(post.images.length > 0 ? { image: post.images } : {}),
    commentCount: comments.length,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.like_count,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: comments.length,
      },
    ],
    ...(comments.length > 0
      ? {
          comment: comments.map((c) => ({
            "@type": "Comment",
            text: c.body,
            datePublished: c.created_at,
            author: person(c.author_name, c.author_username),
          })),
        }
      : {}),
  };

  return (
    <main className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <div className="mx-auto max-w-2xl">
        <Link
          href="/feed"
          className="mb-5 inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Feed
        </Link>
        <h1 className="sr-only">{postTitle(post)}</h1>
        <FeedCard
          item={post}
          viewerId={viewer?.id ?? null}
          viewerIsAdmin={viewer?.isAdmin ?? false}
          startOpen
          initialComments={comments}
        />
      </div>
    </main>
  );
}
