import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import Markdown from "@/components/forum/Markdown";
import VoteControl from "@/components/forum/VoteControl";
import ForumSearchBar from "@/components/forum/ForumSearchBar";
import ReplyBox from "@/components/forum/ReplyBox";
import ReportButton from "@/components/ReportButton";

export const revalidate = 60;

type Params = { params: Promise<{ category: string; thread: string }> };

type Post = {
  id: string;
  author_id: string | null;
  body: string | null;
  is_op: boolean;
  parent_id: string | null;
  score: number;
  created_at: string;
};

function excerpt(md: string, len = 155): string {
  const text = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > len ? text.slice(0, len - 1).trimEnd() + "…" : text;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

async function getThread(categorySlug: string, threadSlug: string) {
  const { data: cat } = await supabasePublic
    .from("forum_categories")
    .select("id, slug, name, is_public")
    .eq("slug", categorySlug)
    .maybeSingle();
  if (!cat || !cat.is_public) return null;

  const { data: thread } = await supabasePublic
    .from("forum_threads")
    .select(
      "id, slug, title, images, is_seeded, is_locked, reply_count, created_at, last_activity_at"
    )
    .eq("category_id", cat.id)
    .eq("slug", threadSlug)
    .maybeSingle();
  if (!thread) return null;

  return { cat, thread };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, thread } = await params;
  const data = await getThread(category, thread);
  if (!data) return { title: "Thread not found" };
  const { thread: t } = data;

  const { data: op } = await supabasePublic
    .from("forum_posts")
    .select("body")
    .eq("thread_id", t.id)
    .eq("is_op", true)
    .maybeSingle();

  const indexable = Boolean(t.is_seeded) || (t.reply_count as number) >= 1;

  return {
    title: t.title as string,
    description: op?.body ? excerpt(op.body as string) : undefined,
    alternates: { canonical: `/forums/${category}/${thread}` },
    robots: { index: indexable, follow: true },
  };
}

export default async function ThreadPage({ params }: Params) {
  const { category, thread } = await params;
  const data = await getThread(category, thread);
  if (!data) notFound();
  const { cat, thread: t } = data;
  const locked = Boolean(t.is_locked);
  const threadPath = `/forums/${category}/${thread}`;
  const threadImages = Array.isArray((t as { images?: unknown }).images)
    ? ((t as { images?: string[] }).images as string[])
    : [];

  const { data: postsData } = await supabasePublic
    .from("forum_posts")
    .select("id, author_id, body, is_op, parent_id, score, created_at")
    .eq("thread_id", t.id)
    .order("created_at", { ascending: true });

  const all = (postsData ?? []) as Post[];
  const op = all.find((p) => p.is_op);
  const comments = all.filter((p) => !p.is_op);

  // author names
  const authorIds = Array.from(
    new Set(
      all
        .map((p) => p.author_id)
        .filter((x): x is string => Boolean(x))
    )
  );
  const byId: Record<string, { username: string | null; full_name: string | null }> = {};
  if (authorIds.length > 0) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id, username, full_name")
      .in("id", authorIds);
    for (const p of profs ?? []) {
      byId[p.id as string] = {
        username: p.username as string | null,
        full_name: p.full_name as string | null,
      };
    }
  }
  const authorLabel = (id: string | null) => {
    if (!id) return "a member";
    const n = byId[id];
    return n?.username ? `@${n.username}` : n?.full_name || "a member";
  };

  // comment tree
  const childrenByParent = new Map<string, Post[]>();
  for (const c of comments) {
    const key = c.parent_id ?? "root";
    const arr = childrenByParent.get(key) ?? [];
    arr.push(c);
    childrenByParent.set(key, arr);
  }
  const roots = (childrenByParent.get("root") ?? [])
    .slice()
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  const sortKids = (arr: Post[]) =>
    arr
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

  function renderComment(c: Post) {
    const kids = sortKids(childrenByParent.get(c.id) ?? []);
    return (
      <div key={c.id} className="flex gap-2">
        <VoteControl postId={c.id} initialScore={c.score ?? 0} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ocean-500">
            <span className="text-ocean-300">
              {authorLabel(c.author_id)}
            </span>{" "}
            · {timeAgo(c.created_at)}
          </p>
          <div className="mt-1">
            <Markdown>{c.body ?? ""}</Markdown>
          </div>
          {!locked && <ReplyBox threadId={t.id as string} parentId={c.id} compact />}
          <div className="mt-1">
            <ReportButton
              targetType="forum_post"
              targetId={c.id}
              targetLabel={t.title as string}
              targetUrl={threadPath}
            />
          </div>
          {kids.length > 0 && (
            <div className="mt-3 space-y-3 border-l border-ocean-800/40 pl-3">
              {kids.map((k) => renderComment(k))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const canonical = `https://www.undergroundaquarium.com/forums/${category}/${thread}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: t.title,
    url: canonical,
    datePublished: t.created_at,
    dateModified: t.last_activity_at,
    author: { "@type": "Person", name: authorLabel(op?.author_id ?? null) },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: t.reply_count,
    },
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto">
        <nav className="flex items-center gap-1.5 text-sm text-ocean-400 mb-6">
          <Link href="/forums" className="hover:text-white transition-colors">
            Forums
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href={`/forums/${category}`}
            className="hover:text-white transition-colors"
          >
            {cat.name}
          </Link>
        </nav>

        <div className="mb-6">
          <ForumSearchBar />
        </div>

        <h1 className="font-display text-3xl text-white mb-5">{t.title}</h1>

        {/* Opening post */}
        <article className="flex gap-3 rounded-2xl border border-ocean-700/60 bg-ocean-900/40 p-5 mb-8">
          {op && <VoteControl postId={op.id} initialScore={op.score ?? 0} />}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ocean-500 mb-2">
              Posted by{" "}
              <span className="text-ocean-300">
                {authorLabel(op?.author_id ?? null)}
              </span>{" "}
              · {timeAgo(op?.created_at ?? null)}
            </p>
            <Markdown>{op?.body ?? ""}</Markdown>
            {threadImages.length > 0 && (
              <div
                className={`mt-4 grid gap-2 ${
                  threadImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {threadImages.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt="Post photo"
                    className="w-full rounded-xl border border-ocean-800/60 object-cover max-h-[28rem]"
                  />
                ))}
              </div>
            )}
            {op && (
              <div className="mt-3">
                <ReportButton
                  targetType="forum_post"
                  targetId={op.id}
                  targetLabel={t.title as string}
                  targetUrl={threadPath}
                />
              </div>
            )}
          </div>
        </article>

        {/* Comments */}
        <h2 className="text-white font-medium mb-4">
          {t.reply_count} {t.reply_count === 1 ? "comment" : "comments"}
        </h2>

        {locked ? (
          <p className="flex items-center gap-2 text-sm text-ocean-400 mb-6">
            <Lock className="w-4 h-4" /> This thread is locked.
          </p>
        ) : (
          <ReplyBox threadId={t.id as string} placeholder="Add a comment…" />
        )}

        <div className="space-y-4">
          {roots.length === 0 ? (
            <p className="text-sm text-ocean-500">
              No comments yet — be the first.
            </p>
          ) : (
            roots.map((c) => renderComment(c))
          )}
        </div>
      </div>
    </main>
  );
}
