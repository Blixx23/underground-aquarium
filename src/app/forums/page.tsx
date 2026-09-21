import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, ChevronRight, MessageSquareDashed } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import ForumSearchBar from "@/components/forum/ForumSearchBar";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Forums",
  description:
    "Aquarium keeping discussions — beginner help, fish health, planted tanks, saltwater, breeding, and gear.",
  alternates: { canonical: "/forums" },
};

export default async function ForumsIndex() {
  const { data: categories } = await supabasePublic
    .from("forum_categories")
    .select("id, slug, name, description, sort_order")
    .eq("is_public", true)
    .order("sort_order", { ascending: true });

  // RLS hides hidden threads, so everything returned here is publicly visible.
  const { data: threads } = await supabasePublic
    .from("forum_threads")
    .select("id, category_id, title, slug, last_activity_at")
    .order("last_activity_at", { ascending: false });

  const { count: unanswered } = await supabasePublic
    .from("forum_threads")
    .select("id", { count: "exact", head: true })
    .eq("reply_count", 0)
    .eq("is_seeded", false);

  const cats = categories ?? [];
  const allThreads = threads ?? [];

  const byCat = new Map<string, typeof allThreads>();
  for (const t of allThreads) {
    const key = t.category_id as string;
    const arr = byCat.get(key) ?? [];
    arr.push(t);
    byCat.set(key, arr);
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">Forums</h1>
        <p className="text-ocean-400 mb-6">
          Ask questions, share builds, and talk shop with other aquarists.
        </p>

        <div className="mb-3">
          <ForumSearchBar />
        </div>

        <Link
          href="/forums/unanswered"
          className="mb-8 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-2.5 text-sm transition-colors hover:border-amber-400/50"
        >
          <span className="flex items-center gap-2 text-amber-100">
            <MessageSquareDashed className="h-4 w-4 text-amber-300" />
            Unanswered topics
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            {unanswered ?? 0}
            <ChevronRight className="h-4 w-4" />
          </span>
        </Link>

        <div className="space-y-3">
          {cats.map((c) => {
            const ts = byCat.get(c.id as string) ?? [];
            const latest = ts[0];
            return (
              <Link
                key={c.id as string}
                href={`/forums/${c.slug}`}
                className="block rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 hover:border-ocean-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <MessagesSquare className="w-5 h-5 text-ocean-300 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-white font-medium">{c.name}</p>
                      {c.description && (
                        <p className="text-sm text-ocean-400">{c.description}</p>
                      )}
                      {latest && (
                        <p className="text-xs text-ocean-600 mt-1 truncate">
                          Latest: {latest.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-ocean-500">
                    <span className="text-xs whitespace-nowrap">
                      {ts.length} {ts.length === 1 ? "thread" : "threads"}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
