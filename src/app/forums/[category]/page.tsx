import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Pin, PenLine } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import VoteControl from "@/components/forum/VoteControl";

export const revalidate = 60;

type Params = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string }>;
};

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

async function getCategory(slug: string) {
  const { data } = await supabasePublic
    .from("forum_categories")
    .select("id, slug, name, description, is_public")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat || !cat.is_public) return { title: "Forum" };

  const { data: threads } = await supabasePublic
    .from("forum_threads")
    .select("is_seeded, reply_count")
    .eq("category_id", cat.id);
  const indexable = (threads ?? []).filter(
    (t) => t.is_seeded || (t.reply_count as number) >= 1
  ).length;

  return {
    title: `${cat.name} — Forums`,
    description: cat.description ?? undefined,
    alternates: { canonical: `/forums/${category}` },
    robots: { index: indexable >= 3, follow: true },
  };
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { category } = await params;
  const { sort = "active" } = await searchParams;
  const cat = await getCategory(category);
  if (!cat || !cat.is_public) notFound();

  let query = supabasePublic
    .from("forum_threads")
    .select(
      "id, slug, title, score, reply_count, is_pinned, created_at, last_activity_at, author_id"
    )
    .eq("category_id", cat.id)
    .order("is_pinned", { ascending: false });
  if (sort === "new") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "top") {
    query = query
      .order("score", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("last_activity_at", { ascending: false });
  }

  const { data: threadsData } = await query;
  const threads = threadsData ?? [];

  const threadIds = threads.map((t) => t.id as string);
  const opByThread: Record<string, string> = {};
  if (threadIds.length > 0) {
    const { data: ops } = await supabasePublic
      .from("forum_posts")
      .select("id, thread_id")
      .eq("is_op", true)
      .in("thread_id", threadIds);
    for (const o of ops ?? []) {
      opByThread[o.thread_id as string] = o.id as string;
    }
  }

  const authorIds = Array.from(
    new Set(
      threads
        .map((t) => t.author_id as string | null)
        .filter((x): x is string => Boolean(x))
    )
  );
  const nameById: Record<string, { username: string | null; full_name: string | null }> = {};
  if (authorIds.length > 0) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id, username, full_name")
      .in("id", authorIds);
    for (const p of profs ?? []) {
      nameById[p.id as string] = {
        username: p.username as string | null,
        full_name: p.full_name as string | null,
      };
    }
  }
  const authorLabel = (id: string | null) => {
    if (!id) return "a member";
    const n = nameById[id];
    return n?.username ? `@${n.username}` : n?.full_name || "a member";
  };

  const tab = (key: string, label: string) => (
    <Link
      href={`/forums/${category}?sort=${key}`}
      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
        sort === key
          ? "bg-ocean-700 text-white"
          : "text-ocean-400 hover:text-ocean-200"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/forums"
          className="inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-ocean-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Forums
        </Link>

        <div className="flex items-end justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="font-display text-3xl text-white mb-1">{cat.name}</h1>
            {cat.description && (
              <p className="text-ocean-400">{cat.description}</p>
            )}
          </div>
          <Link
            href={`/forums/${category}/new`}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
          >
            <PenLine className="w-4 h-4" /> New post
          </Link>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-ocean-900/60 border border-ocean-800/60 p-1 w-fit mb-4">
          {tab("active", "Active")}
          {tab("new", "New")}
          {tab("top", "Top")}
        </div>

        {threads.length === 0 ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400">
            No threads here yet — start the first one.
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => {
              const url = `/forums/${category}/${t.slug}`;
              const opId = opByThread[t.id as string];
              return (
                <article
                  key={t.id as string}
                  className="flex gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 hover:border-ocean-700 transition-colors"
                >
                  {opId ? (
                    <VoteControl
                      postId={opId}
                      initialScore={(t.score as number) ?? 0}
                    />
                  ) : (
                    <div className="w-6" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={url}>
                      <h3 className="text-white font-medium leading-snug hover:text-ocean-100">
                        {t.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-ocean-500 mt-1 flex items-center gap-1.5">
                      {t.is_pinned && <Pin className="w-3 h-3 text-amber-300" />}
                      Posted by {authorLabel(t.author_id as string | null)} ·{" "}
                      {timeAgo(t.created_at as string)}
                    </p>
                    <Link
                      href={url}
                      className="inline-flex items-center gap-1.5 text-xs text-ocean-400 hover:text-ocean-200 mt-2"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> {t.reply_count}{" "}
                      comments
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
