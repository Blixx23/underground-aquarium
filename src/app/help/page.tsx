import type { Metadata } from "next";
import HelpIndexView from "@/components/help/HelpIndexView";
import StillStuck from "@/components/help/StillStuck";
import { getHelpArticles } from "@/lib/help/content";
import { HELP_CATEGORIES } from "@/lib/help/types";
import { shareMeta } from "@/lib/seo/share";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Answers for Underground Aquarium: posting free classifieds, messaging, forums, the Society, Tank Builder, Water Check, fish stores and your account.",
  alternates: { canonical: "/help" },
  ...shareMeta({ path: "/help", alt: "Underground Aquarium help center" }),
};

// Built once per deploy from content/help/*.md. Member help only: admin
// guides live in content/help-admin and are served inside /admin.
export const dynamic = "force-static";

const POPULAR: { label: string; href: string }[] = [
  { label: "Post a free ad", href: "/help/posting-a-classified-ad" },
  { label: "Mark as sold", href: "/help/marking-sold-and-deleting#how-do-i-mark-a-listing-as-sold" },
  { label: "Message a seller", href: "/help/contacting-a-seller#how-do-i-message-a-seller" },
  { label: "Claim my store", href: "/help/claiming-your-store#how-do-i-claim-my-store" },
  { label: "Join the Society", href: "/help/joining-the-society" },
  { label: "Reset password", href: "/help/signing-in-and-passwords#i-forgot-my-password-how-do-i-reset-it" },
  { label: "Tank Builder warnings", href: "/help/tank-builder-compatibility-warnings" },
];

export default function HelpPage() {
  const articles = getHelpArticles("member");
  const answers = articles.reduce((n, a) => n + a.sections.filter((s) => s.anchor).length, 0);

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <HelpIndexView
        eyebrow="Help Center"
        title="How can we help?"
        intro={`${answers.toLocaleString("en-US")} answers across ${articles.length} guides, covering every part of Underground Aquarium.`}
        articles={articles}
        categories={HELP_CATEGORIES}
        base="/help"
        indexUrl="/help/search-index.json"
        popular={POPULAR}
        footer={<StillStuck />}
      />
    </main>
  );
}
