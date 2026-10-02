import "server-only";
import { OPS_SITE, opsGithubRepo } from "@/lib/ops/config";

/**
 * Sends a bug finding to GitHub as an issue that mentions @claude. The
 * Claude workflow in .github/workflows/claude.yml picks it up, writes the
 * fix on a branch and links a pull request. Vercel builds a preview of
 * that branch; nothing goes live until Chris merges.
 */
export async function openFixIssue(f: {
  id: string;
  title: string;
  detail: string | null;
  evidence: string | null;
  suggested_action: string | null;
  link: string | null;
}): Promise<string> {
  const token = process.env.OPS_GITHUB_TOKEN;
  if (!token) throw new Error("OPS_GITHUB_TOKEN isn't set in Vercel.");

  const body = [
    `Found by the AI operating team. Ticket: ${OPS_SITE}/admin/ops#${f.id}`,
    f.link ? `Where: ${f.link.startsWith("/") ? OPS_SITE + f.link : f.link}` : "",
    f.detail ? `## What's wrong\n${f.detail}` : "",
    f.evidence ? `## Evidence\n${f.evidence}` : "",
    f.suggested_action ? `## Suggested fix\n${f.suggested_action}` : "",
    `## For @claude\n@claude please fix this. Keep the change as small as possible and follow CLAUDE.md. ` +
      `Work on a new branch and open a pull request that explains the change in plain words. ` +
      `Don't touch payments, Stripe, sign-in, or database structure; if the fix needs that, stop and explain in a comment instead.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await fetch(`https://api.github.com/repos/${opsGithubRepo()}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({ title: `[AI team] ${f.title}`, body }),
  });
  if (!res.ok) throw new Error(`GitHub said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { html_url: string };
  return data.html_url;
}
