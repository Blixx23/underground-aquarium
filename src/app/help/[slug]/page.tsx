import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HelpArticleView from "@/components/help/HelpArticleView";
import { getHelpArticle, getHelpArticles } from "@/lib/help/content";
import { breadcrumbJsonLd, ldJson, SITE } from "@/lib/marketplace/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getHelpArticles("member").map((a) => ({ slug: a.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getHelpArticle(slug, "member");
  if (!a) notFound();
  const title = `${a.title} | Help`;
  return {
    title,
    description: a.summary,
    alternates: { canonical: `/help/${a.slug}` },
    openGraph: { title, description: a.summary, url: `${SITE}/help/${a.slug}`, type: "article" },
  };
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = getHelpArticle(slug, "member");
  if (!a) notFound();

  const related = getHelpArticles("member").filter((x) => x.category === a.category && x.slug !== a.slug);

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbJsonLd([
              { name: "Help Center", path: "/help" },
              { name: a.title, path: `/help/${a.slug}` },
            ])
          ),
        }}
      />
      <HelpArticleView
        article={a}
        related={related}
        base="/help"
        indexUrl="/help/search-index.json"
        backLabel="Help Center"
      />
    </main>
  );
}
