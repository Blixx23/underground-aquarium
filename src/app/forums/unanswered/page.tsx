import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquareDashed, MessageSquare } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Unanswered topics — Forums",
  description: "Forum posts still waiting on their first reply.",
  alternates: { canonical: "/forums/unanswered" },
  robots: { index: false, follow: true },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return mo < 12 ? `${mo}mo ago` : `${Math.floor(mo / 12)}y ago`;
}

/**
 * Everything members posted that nobody has answered yet, oldest waiting
 * first can be buried, so newest first: the person who just asked is the
 * one most likely to come back if someone says hello.
 */
export default async function UnansweredPage() {
  const [{ data: cats }, { data: rows }] = await Promise.all([
    supabasePublic.from("forum_categories").select("id, slug, name").eq("is_public", true),
    supabasePublic
      .from("forum_threads")
      .select("id, slug, title, category_id, author_id, created_at")
      .eq("reply_count", 0)
      .eq("is_seeded", false)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const catById = new Map((cats ?? []).map((c) => [c.id as string, c]));
  const threads = (rows ?? []).filter((t) => catById.has(t.category_id as string));

  const authorIds = [...new Set(threads.map((t) => t.author_id as string).filter(Boolean))];
  const nameById = new Map<string, string>();
  if (authorIds.length) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id, username, full_name")
      .in("id", authorIds);
    for (const p of profs ?? []) {
      nameById.set(p.id as string, p.username ? `@${p.username}` : (p.full_name as string) || "a member");
    }
  }

  return (
    <main className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/forums"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ocean-400 transition-colors hover:text-ocean-200"
        >
          <ArrowLeft className="h-4 w-4" /> Forums
        </Link>

        <h1 className="mb-1 font-display text-3xl text-white">Unanswered topics</h1>
        <p className="mb-6 text-ocean-400">
          Someone asked and nobody has replied yet. A quick answer, or even a hello, is often what
          decides whether a new member comes back.
        </p>

        {threads.length === 0 ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center">
            <MessageSquareDashed className="mx-auto mb-3 h-7 w-7 text-ocean-600" />
            <p className="text-ocean-300">Every topic has a reply. Nice work, everyone.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => {
              const cat = catById.get(t.category_id as string)!;
              return (
                <Link
                  key={t.id as string}
                  href={`/forums/${cat.slug}/${t.slug}`}
                  className="flex items-start gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 transition-colors hover:border-ocean-700"
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug text-white">{t.title}</span>
                    <span className="mt-1 block text-xs text-ocean-500">
                      {cat.name} · {nameById.get(t.author_id as string) ?? "a member"} ·{" "}
                      {timeAgo(t.created_at as string)}
                    </span>
                  </span>
                  <span className="shrink-0 self-center rounded-full border border-ocean-700 px-3 py-1 text-xs text-ocean-200">
                    Reply
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
