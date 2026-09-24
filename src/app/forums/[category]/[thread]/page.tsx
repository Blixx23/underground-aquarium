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
import SocietySeal from "@/components/society/SocietySeal";
import RelatedGuides from "@/components/discover/RelatedGuides";
import { keywords, relatedThreads } from "@/lib/discover";
import ScrollToComment from "@/components/forum/ScrollToComment";

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
  if (d < 7) return d === 1 ? "yesterday" : `${d} days ago`;
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  });
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
  const related = await relatedThreads({
    terms: keywords(t.title as string),
    excludeId: t.id as string,
    fallbackCategoryId: cat.id as string,
  });
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
  // Who among the authors is in the Society (for the seal).
  const society = new Set<string>();
  if (authorIds.length > 0) {
    const { data: members } = await supabasePublic.rpc("society_members_among", {
      p_users: authorIds,
    });
    for (const m of (members ?? []) as (string | { user_id: string })[]) {
      society.add(typeof m === "string" ? m : m.user_id);
    }
  }
  const authorLabel = (id: string | null) => {
    if (!id) return "a member";
    const n = byId[id];
    return n?.full_name?.trim() || n?.username || "a member";
  };
  const Author = ({ id }: { id: string | null }) => {
    const n = id ? byId[id] : undefined;
    const label = authorLabel(id);
    const isSoc = id ? society.has(id) : false;
    const name = n?.username ? (
      <Link
        href={`/u/${n.username}`}
        className={"text-ocean-200 hover:underline"}
      >
        {label}
      </Link>
    ) : (
      <span className="text-ocean-300">{label}</span>
    );
    return (
      <>
        {name}
        {isSoc && (
          <span title="Underground Aquarium Society member" className="ml-1 inline-flex translate-y-[2px]">
            <SocietySeal size={13} className="h-[13px] w-[13px]" />
          </span>
        )}
      </>
    );
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
      <div
        key={c.id}
        id={`post-${c.id}`}
        className="-mx-2 flex scroll-mt-28 gap-2 rounded-xl px-2 py-1 transition-colors duration-700"
      >
        <VoteControl postId={c.id} initialScore={c.score ?? 0} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ocean-500">
            <Author id={c.author_id} />{" "}
            · <time dateTime={c.created_at}>{timeAgo(c.created_at)}</time>
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
      <ScrollToComment />
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
              <Author id={op?.author_id ?? null} />{" "}
              · <time dateTime={op?.created_at ?? undefined}>{timeAgo(op?.created_at ?? null)}</time>
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

        <RelatedGuides guides={related} title="Keep reading" />
      </div>
    </main>
  );
}
