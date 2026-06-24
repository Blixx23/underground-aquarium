import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import ForumSearchBar from "@/components/forum/ForumSearchBar";

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
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let val = secs;
  let label = "s";
  for (const [step, unit] of units) {
    if (val < step) {
      label = unit;
      break;
    }
    val = Math.floor(val / step);
    label = unit;
  }
  return `${val}${label} ago`;
}

// Render highlighted snippets safely: the snippet wraps matches in «mark» … «/mark»
// sentinels (not HTML). We split on them and emit real <mark> nodes, so post
// content is always rendered as plain, escaped text — no HTML injection.
function Highlighted({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const re = /«mark»([\s\S]*?)«\/mark»/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <mark
        key={i++}
        className="rounded bg-amber-300/25 px-0.5 text-amber-100"
      >
        {m[1]}
      </mark>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export default async function ForumSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let rows: Row[] = [];
  if (query.length >= 2) {
    const { data } = await supabasePublic.rpc("search_forum", {
      p_q: query,
      p_limit: 40,
    });
    rows = (data ?? []) as Row[];
  }

  // Resolve author names for display.
  const authorIds = Array.from(
    new Set(rows.map((r) => r.author_id).filter(Boolean))
  ) as string[];
  let names: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id, username, full_name")
      .in("id", authorIds);
    names = Object.fromEntries(
      (profs ?? []).map((p) => [
        p.id as string,
        (p.username as string) || (p.full_name as string) || "Member",
      ])
    );
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">
          Search the forums
        </h1>
        <p className="text-ocean-400 mb-6">
          Search every thread and reply by keyword or phrase.
        </p>

        <div className="mb-8">
          <ForumSearchBar initialQuery={query} autoFocus={query.length === 0} />
        </div>

        {query.length < 2 ? (
          <p className="text-sm text-ocean-500">
            Type a couple of words to search.
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-8 text-center">
            <MessagesSquare className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-ocean-300">
              No results for &ldquo;{query}&rdquo;.
            </p>
            <p className="text-sm text-ocean-500 mt-1">
              Try fewer or different words.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-ocean-500 mb-4">
              {rows.length} result{rows.length === 1 ? "" : "s"} for &ldquo;
              {query}&rdquo;
            </p>
            <div className="space-y-3">
              {rows.map((r) => (
                <Link
                  key={r.thread_id}
                  href={`/forums/${r.category_slug}/${r.thread_slug}`}
                  className="block rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 hover:border-ocean-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ocean-500 mb-1">
                    <span className="text-ocean-400">{r.category_name}</span>
                    <span>·</span>
                    <span>
                      {r.reply_count ?? 0}{" "}
                      {(r.reply_count ?? 0) === 1 ? "reply" : "replies"}
                    </span>
                    {r.last_activity_at && (
                      <>
                        <span>·</span>
                        <span>{timeAgo(r.last_activity_at)}</span>
                      </>
                    )}
                  </div>
                  <p className="text-white font-medium mb-1">{r.title}</p>
                  {r.snippet && (
                    <p className="text-sm text-ocean-400 leading-relaxed">
                      <Highlighted text={r.snippet} />
                    </p>
                  )}
                  {r.author_id && names[r.author_id] && (
                    <p className="text-xs text-ocean-600 mt-1.5">
                      by {names[r.author_id]}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
