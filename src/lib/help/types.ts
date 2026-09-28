// Shared by the server loader and the browser search, so no Node imports here.

export type HelpArticleMeta = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  order: number;
  keywords: string[];
  pages: string[];
};

export type HelpSection = {
  slug: string;
  articleTitle: string;
  category: string;
  heading: string;
  anchor: string; // "" = top of the article
  text: string;
  keywords?: string;
};

export const HELP_CATEGORIES = [
  "Getting started",
  "Classifieds",
  "Messages",
  "Community",
  "The Society",
  "Events",
  "Tools & learning",
  "Fish stores",
  "For store owners",
  "Account & safety",
  "Help",
] as const;

export function helpHref(s: { slug: string; anchor?: string }): string {
  return s.anchor ? `/help/${s.slug}#${s.anchor}` : `/help/${s.slug}`;
}
