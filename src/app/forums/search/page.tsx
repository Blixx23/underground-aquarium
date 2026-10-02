import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, MessageCircle, Clock, User } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import ForumSearchBar from "@/components/forum/ForumSearchBar";
import { Snippet } from "@/lib/forum/snippet";

// Query pages shouldn't be indexed (thin/duplicate); keep them out of search engines.
export const metadata: Metadata = {
  title: "Search the forums",
  robots: { index: false, follow: true },
};

type Row = {
  thread_id: string;
  thread_slug: string;
  title: string;
  category_slug: string;
  category_name: string;
  author_id: string | null;
  reply_count: number | null;
  score: number | null;
  last_activity_at: string | null;
  created_at: string | null;
  snippet: string | null;
  rank: number;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ForumSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; forum?: string }>;
}) {
  const { q, forum } = await searchParams;
  const query = (q ?? "").trim();

  let rows: Row[] = [];
  if (query.length >= 2) {
    const { data } = await supabasePublic.rpc("search_forum", { p_q: query, p_limit: 60 });
    rows = (data ?? []) as Row[];
  }

  // Forums the results come from, with counts, for the filter chips.
  const forums: { slug: string; name: string; count: number }[] = [];
  for (const r of rows) {
    const f = forums.find((x) => x.slug === r.category_slug);
    if (f) f.count++;
    else forums.push({ slug: r.category_slug, name: r.category_name, count: 1 });
  }
  forums.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const activeForum = forum && forums.some((f) => f.slug === forum) ? forum : null;
  const shown = activeForum ? rows.filter((r) => r.category_slug === activeForum) : rows;

  // Author names for display.
  const authorIds = Array.from(new Set(shown.map((r) => r.author_id).filter(Boolean))) as string[];
  let names: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profs } = await supabasePublic.from("profiles").select("id, username, full_name").in("id", authorIds);
    names = Object.fromEntries(
      (profs ?? []).map((p) => [
        p.id as string,
        ((p.full_name as string | null)?.trim() || (p.username as string) || "Member") as string,
      ])
    );
  }

  const chip = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      active
        ? "border-ocean-300 bg-ocean-200 text-ocean-950 font-medium"
        : "border-ocean-700/70 bg-ocean-900/50 text-ocean-100 hover:border-ocean-500"
    }`;
  const base = `/forums/search?q=${encodeURIComponent(query)}`;

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 font-display text-3xl text-white">Search the forums</h1>
        <p className="mb-6 text-ocean-300">Search every thread and reply by keyword or phrase.</p>

        <div className="mb-6">
          <ForumSearchBar initialQuery={query} autoFocus={query.length === 0} />
        </div>

        {query.length < 2 ? (
          <p className="text-sm text-ocean-300">Type a couple of words to search.</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-ocean-700/60 bg-ocean-900/50 p-8 text-center">
            <MessagesSquare className="mx-auto mb-3 h-8 w-8 text-ocean-400" />
            <p className="text-ocean-100">No results for &ldquo;{query}&rdquo;.</p>
            <p className="mt-1 text-sm text-ocean-300">Try fewer or different words.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-ocean-200">
              <span className="font-semibold text-white">{shown.length}</span> result{shown.length === 1 ? "" : "s"} for
              &ldquo;{query}&rdquo;
              {activeForum && (
                <>
                  {" "}in <span className="font-semibold text-white">{forums.find((f) => f.slug === activeForum)?.name}</span>
                </>
              )}
            </p>

            {/* Filter by forum */}
            {forums.length > 1 && (
              <nav
                aria-label="Filter by forum"
                className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
              >
                <Link href={base} className={chip(!activeForum)} scroll={false}>
                  All <span className="opacity-70">{rows.length}</span>
                </Link>
                {forums.map((f) => (
                  <Link
                    key={f.slug}
                    href={`${base}&forum=${encodeURIComponent(f.slug)}`}
                    className={chip(activeForum === f.slug)}
                    scroll={false}
                  >
                    {f.name} <span className="opacity-70">{f.count}</span>
                  </Link>
                ))}
              </nav>
            )}

            <div className="space-y-3">
              {shown.map((r) => (
                <Link
                  key={r.thread_id}
                  href={`/forums/${r.category_slug}/${r.thread_slug}`}
                  className="group block rounded-2xl border border-ocean-700/60 bg-ocean-900/50 p-4 transition-colors hover:border-ocean-400 hover:bg-ocean-900/80 sm:p-5"
                >
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-ocean-700/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ocean-100">
                    <MessagesSquare className="h-3 w-3" />
                    {r.category_name}
                  </span>
                  <p className="text-lg font-semibold leading-snug text-white group-hover:underline">{r.title}</p>
                  {r.snippet && (
                    <p className="mt-1.5 line-clamp-3 text-[15px] leading-relaxed text-ocean-100">
                      <Snippet text={r.snippet} />
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ocean-300">
                    {r.author_id && names[r.author_id] && (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {names[r.author_id]}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {r.reply_count ?? 0} {(r.reply_count ?? 0) === 1 ? "reply" : "replies"}
                    </span>
                    {r.last_activity_at && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {timeAgo(r.last_activity_at)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
