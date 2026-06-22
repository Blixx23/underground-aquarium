import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Pin } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 120;

type Params = { params: Promise<{ category: string }> };

async function getCategory(slug: string) {
  const { data } = await supabasePublic
    .from("forum_categories")
    .select("id, slug, name, description, is_public")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat || !cat.is_public) return { title: "Forum" };

  // Only index a category page once it holds a few substantive threads,
  // so thin/near-empty category pages stay out of the index.
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

export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat || !cat.is_public) notFound();

  const { data: threads } = await supabasePublic
    .from("forum_threads")
    .select("id, slug, title, reply_count, is_pinned, last_activity_at")
    .eq("category_id", cat.id)
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false });

  const list = threads ?? [];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/forums"
          className="inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-ocean-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Forums
        </Link>
        <h1 className="font-display text-3xl text-white mb-1">{cat.name}</h1>
        {cat.description && (
          <p className="text-ocean-400 mb-8">{cat.description}</p>
        )}

        {list.length === 0 ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400">
            No threads here yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 divide-y divide-ocean-800/40">
            {list.map((t) => (
              <Link
                key={t.id as string}
                href={`/forums/${category}/${t.slug}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-ocean-800/20 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2">
                  {t.is_pinned && (
                    <Pin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  )}
                  <span className="text-ocean-100 truncate">{t.title}</span>
                </div>
                <span className="text-xs text-ocean-500 shrink-0 inline-flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> {t.reply_count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
