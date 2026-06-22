import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bubbleTier } from "@/lib/bubbles";
import { sendEmail, tierUpEmail } from "@/lib/email";

export async function POST(req: Request) {
  let body: { post_id?: string; value?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const postId = body.post_id;
  const value = body.value;
  if (!postId || (value !== -1 && value !== 0 && value !== 1)) {
    return NextResponse.json({ error: "Bad vote." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  }

  // Look up the post's author so we can detect a tier-up afterwards.
  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  const authorId = (post.author_id as string | null) ?? null;

  // Author's balance before the vote (skip the lookup for self-votes).
  let beforeBalance = 0;
  const checkTier = Boolean(authorId) && authorId !== user.id;
  if (checkTier) {
    const { data: a } = await supabaseAdmin
      .from("profiles")
      .select("bubble_balance")
      .eq("id", authorId as string)
      .maybeSingle();
    beforeBalance = (a?.bubble_balance as number) ?? 0;
  }

  // Apply the vote. value 0 clears it; otherwise upsert. RLS keeps users to
  // their own rows; the score trigger updates the cached score and balance.
  if (value === 0) {
    const { error } = await supabase
      .from("forum_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("forum_votes")
      .upsert(
        { user_id: user.id, post_id: postId, value },
        { onConflict: "user_id,post_id" }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: postAfter } = await supabase
    .from("forum_posts")
    .select("score")
    .eq("id", postId)
    .maybeSingle();
  const score = postAfter?.score ?? 0;

  // Tier-up? Notify + email the author (never on a self-vote).
  if (checkTier) {
    const { data: a2 } = await supabaseAdmin
      .from("profiles")
      .select("bubble_balance, username")
      .eq("id", authorId as string)
      .maybeSingle();
    const afterBalance = (a2?.bubble_balance as number) ?? 0;
    const afterTier = bubbleTier(afterBalance);
    if (afterTier.rank > bubbleTier(beforeBalance).rank) {
      // Atomically claim the new tier so simultaneous or repeated votes can't
      // each fire the same alert — only the first to raise the tier notifies.
      const { data: claimed } = await supabaseAdmin.rpc("claim_bubble_tier", {
        p_user_id: authorId,
        p_rank: afterTier.rank,
      });
      if (!claimed) return NextResponse.json({ ok: true, score, value });
      const tier = afterTier;
      const uname = (a2?.username as string | null) ?? null;
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: authorId,
          type: "bubbles",
          title: `New tier: ${tier.name}`,
          body: `Your bubbles carried you into ${tier.name}. Keep it up!`,
          link: uname ? `/u/${uname}` : null,
        });
      } catch {
        // ignore
      }
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
          authorId as string
        );
        const to = authUser?.user?.email ?? null;
        if (to) {
          const t = tierUpEmail({
            tierName: tier.name,
            balance: afterBalance,
            username: uname,
          });
          await sendEmail({ to, subject: t.subject, html: t.html });
        }
      } catch {
        // ignore
      }
    }
  }

  return NextResponse.json({ ok: true, score, value });
}
