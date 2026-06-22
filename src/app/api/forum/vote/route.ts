import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // value 0 clears the vote; otherwise upsert it. RLS keeps users to their own
  // rows; the score trigger updates the cached score.
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

  const { data: post } = await supabase
    .from("forum_posts")
    .select("score")
    .eq("id", postId)
    .maybeSingle();

  return NextResponse.json({ ok: true, score: post?.score ?? 0, value });
}
