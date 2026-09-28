import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HelpArticleView from "@/components/help/HelpArticleView";
import { getHelpArticle, getHelpArticles } from "@/lib/help/content";

// Admins only: the /admin layout already returns "not found" to everyone else.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getHelpArticle(slug, "admin");
  return { title: a ? `${a.title} | Admin help` : "Admin help", robots: { index: false, follow: false } };
}

export default async function AdminHelpArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = getHelpArticle(slug, "admin");
  if (!a) notFound();

  const related = getHelpArticles("admin").filter((x) => x.category === a.category && x.slug !== a.slug);

  return (
    <main>
      <div>
        <HelpArticleView
          article={a}
          related={related}
          base="/admin/help"
          indexUrl="/admin/help/search-index.json"
          backLabel="Admin help"
          showStillStuck={false}
        />
      </div>
    </main>
  );
}
