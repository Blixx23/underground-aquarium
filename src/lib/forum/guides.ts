import { supabasePublic } from "@/lib/supabase/public";
import { FOUNDER_USERNAMES } from "@/lib/founder";

/** Forum sections that hold chat and photo threads, never how-tos. */
const NOT_GUIDE_CATEGORY = /off.?topic|journal|photo/i;
/** Prompts posted to get people talking. */
const NOT_GUIDE_TITLE = /^(introduce yourself|share your|post your|show us|aquarium memes)/i;

export type Guide = {
  title: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  createdAt: string;
  replies: number;
};

/**
 * The founder's how-to threads, gathered as a guide library. The threads stay
 * where they are (and keep their Google standing); this just lists them in
 * one place, so the forums can be for questions and the guides still get found.
 */
export async function getGuides(): Promise<Guide[]> {
  // Usernames are stored as typed ("Chris_Lewis"), so match without case.
  const found = await Promise.all(
    [...FOUNDER_USERNAMES].map((u) => supabasePublic.from("profiles").select("id").ilike("username", u).maybeSingle())
  );
  const ids = found.map((r) => r.data?.id as string | undefined).filter((x): x is string => Boolean(x));
  if (ids.length === 0) return [];

  const [{ data: cats }, { data: threads }] = await Promise.all([
    supabasePublic.from("forum_categories").select("id, slug, name").eq("is_public", true),
    supabasePublic
      .from("forum_threads")
      .select("title, slug, category_id, created_at, reply_count")
      .in("author_id", ids)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const catById = new Map((cats ?? []).map((c) => [c.id as string, c]));
  return (threads ?? [])
    .filter((t) => catById.has(t.category_id as string))
    // Conversation starters ("Aquarium memes", "Introduce yourself") aren't guides.
    .filter((t) => !NOT_GUIDE_CATEGORY.test(catById.get(t.category_id as string)!.name as string))
    .filter((t) => !NOT_GUIDE_TITLE.test(t.title as string))
    .map((t) => {
      const c = catById.get(t.category_id as string)!;
      return {
        title: t.title as string,
        slug: t.slug as string,
        categorySlug: c.slug as string,
        categoryName: c.name as string,
        createdAt: t.created_at as string,
        replies: (t.reply_count as number) ?? 0,
      };
    });
}
