import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractMentions } from "@/lib/mentions";

type Recipient = {
  id: string;
  username: string | null;
  deleted_at: string | null;
  suspended_at: string | null;
  muted_notifications: string[] | null;
};

/**
 * Sends "X mentioned you" to everyone @tagged in a post or comment.
 *
 * Best effort and never throws: a failed notice must not fail the post.
 * Nobody is told twice about the same post (so editing a post only reaches
 * people newly tagged), and nobody hears from someone they've blocked.
 */
export async function notifyMentions({
  authorId,
  text,
  link,
  where,
  skip = [],
}: {
  authorId: string;
  text: string | null | undefined;
  /** Where the notice opens, e.g. /forums/cat/thread#post-id. */
  link: string;
  /** "a forum post", "a comment"... for the notice's text. */
  where: string;
  /** People already getting a notice about this (a reply notice, say). */
  skip?: (string | null | undefined)[];
}): Promise<void> {
  try {
    const handles = extractMentions(text);
    if (!handles.length) return;

    // Exact name, any capitalization. "_" is a wildcard in ilike, so escape it.
    const found = await Promise.all(
      handles.map((h) =>
        supabaseAdmin
          .from("profiles")
          .select("id, username, deleted_at, suspended_at, muted_notifications")
          .ilike("username", h.replace(/_/g, "\\_"))
          .limit(1)
          .maybeSingle()
      )
    );
    const skipSet = new Set([authorId, ...skip.filter(Boolean)] as string[]);
    let people = found
      .map((r) => r.data as Recipient | null)
      .filter((p): p is Recipient => !!p && !p.deleted_at && !p.suspended_at && !skipSet.has(p.id))
      .filter((p) => !(p.muted_notifications ?? []).includes("mention"));
    people = [...new Map(people.map((p) => [p.id, p])).values()];
    if (!people.length) return;

    const ids = people.map((p) => p.id);
    const [{ data: blocks }, { data: already }, { data: author }] = await Promise.all([
      supabaseAdmin.from("user_blocks").select("blocker_id").eq("blocked_id", authorId).in("blocker_id", ids),
      supabaseAdmin.from("notifications").select("user_id").eq("type", "mention").eq("link", link).in("user_id", ids),
      supabaseAdmin.from("profiles").select("username, full_name").eq("id", authorId).maybeSingle(),
    ]);
    const blocked = new Set(((blocks ?? []) as { blocker_id: string }[]).map((b) => b.blocker_id));
    const told = new Set(((already ?? []) as { user_id: string }[]).map((n) => n.user_id));
    const to = people.filter((p) => !blocked.has(p.id) && !told.has(p.id));
    if (!to.length) return;

    const name =
      (author as { full_name?: string | null; username?: string | null } | null)?.full_name?.trim() ||
      (author as { username?: string | null } | null)?.username ||
      "Someone";
    const words = (text ?? "").replace(/\s+/g, " ").trim();
    const snippet = words.length > 120 ? `${words.slice(0, 117).trimEnd()}...` : words;

    await supabaseAdmin.from("notifications").insert(
      to.map((p) => ({
        user_id: p.id,
        type: "mention",
        title: `${name} mentioned you`,
        body: snippet ? `In ${where}: “${snippet}”` : `In ${where}.`,
        link,
      }))
    );
  } catch {
    // Mentions are a nicety; the post itself already saved.
  }
}
