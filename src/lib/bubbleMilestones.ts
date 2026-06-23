import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";

// Grants post-count milestones once each, when the author first reaches them.
export async function checkPostMilestones(userId: string) {
  try {
    const { count } = await supabaseAdmin
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId);
    const n = count ?? 0;
    if (n >= 10) await awardBubbles(userId, "posts_10");
    if (n >= 50) await awardBubbles(userId, "posts_50");
    if (n >= 100) await awardBubbles(userId, "posts_100");
  } catch {
    // best-effort
  }
}

// Grants upvote-received milestones once each. Counts upvotes (value = 1) cast
// on any post the user authored.
export async function checkUpvoteMilestones(userId: string) {
  try {
    const { data: posts } = await supabaseAdmin
      .from("forum_posts")
      .select("id")
      .eq("author_id", userId);
    const ids = (posts ?? []).map((p) => (p as { id: string }).id);
    if (ids.length === 0) return;
    const { count } = await supabaseAdmin
      .from("forum_votes")
      .select("post_id", { count: "exact", head: true })
      .in("post_id", ids)
      .eq("value", 1);
    const n = count ?? 0;
    if (n >= 1) await awardBubbles(userId, "first_upvote");
    if (n >= 50) await awardBubbles(userId, "upvotes_50");
    if (n >= 250) await awardBubbles(userId, "upvotes_250");
    if (n >= 1000) await awardBubbles(userId, "upvotes_1000");
  } catch {
    // best-effort
  }
}
