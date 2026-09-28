import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { HelpArticleMeta, HelpSection } from "./types";

/**
 * The Help Center reads plain markdown from content/help/*.md. No database,
 * no AI, no generated files to drift: edit a .md file, commit, and the next
 * deploy picks it up.
 *
 * Each article is split at its "## " headings. Every heading becomes its own
 * search result that deep-links to that spot in the article.
 */

/**
 * Two separate collections. Member help is public at /help. Admin help lives
 * in content/help-admin and is only served inside /admin (the admin layout
 * checks is_admin), so none of it reaches the public site, search or sitemap.
 */
export type HelpCollection = "member" | "admin";

const HELP_DIRS: Record<HelpCollection, string> = {
  member: path.join(process.cwd(), "content", "help"),
  admin: path.join(process.cwd(), "content", "help-admin"),
};

export type HelpArticle = HelpArticleMeta & {
  intro: string; // markdown before the first "## "
  body: string; // full markdown body (intro included)
  sections: HelpSection[];
};

/** Same rule the docs use for #anchors: lowercase, runs of non-alphanumerics to one hyphen. */
export function helpAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Markdown to plain text for search and descriptions. */
export function mdToText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_`>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: m[2] };
}

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function parseArticle(slug: string, raw: string): HelpArticle {
  const { data, body } = parseFrontmatter(raw);
  const title = data.title || slug;
  const category = data.category || "Help";

  // Split on "## " (not "### ") outside code fences.
  const parts: { heading: string | null; md: string }[] = [{ heading: null, md: "" }];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) inFence = !inFence;
    const h = !inFence && line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h) parts.push({ heading: h[1].trim(), md: "" });
    else parts[parts.length - 1].md += line + "\n";
  }

  const intro = parts[0].md.trim();
  const sections: HelpSection[] = [];
  if (intro) {
    sections.push({ slug, articleTitle: title, category, heading: title, anchor: "", text: mdToText(intro) });
  }
  for (const p of parts.slice(1)) {
    sections.push({
      slug,
      articleTitle: title,
      category,
      heading: p.heading!,
      anchor: helpAnchor(p.heading!),
      text: mdToText(p.md),
    });
  }

  return {
    slug,
    title,
    category,
    summary: data.summary || "",
    order: Number(data.order) || 100,
    keywords: list(data.keywords),
    pages: list(data.pages),
    intro,
    body,
    sections,
  };
}

export const getHelpArticles = cache((collection: HelpCollection = "member"): HelpArticle[] => {
  const dir = HELP_DIRS[collection];
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map((f) => parseArticle(f.replace(/\.md$/, ""), fs.readFileSync(path.join(dir, f), "utf8")))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
});

export function getHelpArticle(slug: string, collection: HelpCollection = "member"): HelpArticle | undefined {
  return getHelpArticles(collection).find((a) => a.slug === slug);
}

/** Every searchable section, with the article's keywords folded in so synonyms still hit. */
export function getHelpSections(collection: HelpCollection = "member"): HelpSection[] {
  return getHelpArticles(collection).flatMap((a) =>
    a.sections.map((s) => ({ ...s, keywords: a.keywords.join(" ") }))
  );
}

/** Matches a live path against an article's `pages:` patterns, e.g. /stores/[slug]. */
export function helpForPath(pathname: string, limit = 3): HelpArticleMeta[] {
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const hits = getHelpArticles().filter((a) =>
    a.pages.some((p) => {
      const re = new RegExp(
        "^" +
          p
            .replace(/\/+$/, "")
            .split("/")
            .map((seg) => (/^\[.+\]$/.test(seg) ? "[^/]+" : seg.replace(/[.*+?^${}()|\\]/g, "\\$&")))
            .join("/") +
          "$"
      );
      return re.test(clean);
    })
  );
  return hits.slice(0, limit).map(toMeta);
}

export function toMeta(a: HelpArticle): HelpArticleMeta {
  const { slug, title, category, summary, order, keywords, pages } = a;
  return { slug, title, category, summary, order, keywords, pages };
}
