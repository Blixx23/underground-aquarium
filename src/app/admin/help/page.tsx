import type { Metadata } from "next";
import Link from "next/link";
import HelpIndexView from "@/components/help/HelpIndexView";
import { getHelpArticles } from "@/lib/help/content";
import { ADMIN_HELP_CATEGORIES } from "@/lib/help/types";

// Admins only: the /admin layout already returns "not found" to everyone else.
export const metadata: Metadata = { title: "Admin help", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const POPULAR: { label: string; href: string }[] = [
  { label: "The Dashboard", href: "/admin/help/admin-hub" },
  { label: "Reports queue", href: "/admin/help/reports-queue" },
  { label: "Store claims", href: "/admin/help/store-claims" },
  { label: "Approving events", href: "/admin/help/events-review" },
  { label: "Email queue", href: "/admin/help/email-queue-and-health" },
  { label: "Campaigns", href: "/admin/help/campaigns" },
];

export default function AdminHelpPage() {
  const articles = getHelpArticles("admin");
  const answers = articles.reduce((n, a) => n + a.sections.filter((s) => s.anchor).length, 0);

  return (
    <main>
      <div>
        <HelpIndexView
          eyebrow="Admin help"
          title="Running Underground Aquarium"
          intro={
            <>
              {answers.toLocaleString("en-US")} answers across {articles.length} guides for every admin screen, with
              known issues and workarounds. Only admins can see this. Member-facing help is at{" "}
              <Link href="/help" className="text-emerald-400 hover:underline">
                /help
              </Link>
              .
            </>
          }
          articles={articles}
          categories={ADMIN_HELP_CATEGORIES}
          base="/admin/help"
          indexUrl="/admin/help/search-index.json"
          placeholder="Search admin help, e.g. “approve a claim”"
          popular={POPULAR}
        />
      </div>
    </main>
  );
}
