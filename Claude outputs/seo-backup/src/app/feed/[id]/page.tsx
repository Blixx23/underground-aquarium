import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import FeedCard from "@/components/feed/FeedCard";
import { fetchFeed } from "@/lib/feed";
import { getViewer } from "@/lib/feedViewer";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPost(id: string) {
  if (!UUID.test(id)) return { post: null, viewer: null };
  const { viewer, supabase } = await getViewer();
  const { data } = await supabase
    .from("feed_posts")
    .select("user_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { post: null, viewer };
  // Ask the feed for this author's items up to and including this post's time.
  const after = new Date(new Date(data.created_at).getTime() + 1).toISOString();
  const { items } = await fetchFeed(supabase, { scope: "user", userId: data.user_id, before: after, limit: 50 });
  return { post: items.find((i) => i.kind === "post" && i.id === id) ?? null, viewer };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const { post } = await loadPost(id);
  if (!post) return { title: "Post" };
  return {
    title: `${post.author_name} on Underground Aquarium`,
    description: (post.body ?? "").slice(0, 160) || "A post on Underground Aquarium.",
    openGraph: post.images[0] ? { images: [post.images[0]] } : undefined,
  };
}

/** A single post, where notifications and shared links land. */
export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const { post, viewer } = await loadPost(id);
  if (!post) notFound();

  return (
    <main className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/feed"
          className="mb-5 inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Feed
        </Link>
        <FeedCard item={post} viewerId={viewer?.id ?? null} viewerIsAdmin={viewer?.isAdmin ?? false} startOpen />
      </div>
    </main>
  );
}
