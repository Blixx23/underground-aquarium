import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { reviewId } = await request.json();
    if (!reviewId || typeof reviewId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // The shop's response to this review.
    const { data: resp } = await supabaseAdmin
      .from("review_responses")
      .select("review_id, store_id, user_id, updated_at")
      .eq("review_id", reviewId)
      .maybeSingle();
    if (!resp) return NextResponse.json({ ok: true });

    // Only notify for a freshly-saved response (guards against replays).
    const ageMs = Date.now() - new Date(resp.updated_at as string).getTime();
    if (ageMs > 10 * 60 * 1000) return NextResponse.json({ ok: true });

    // The review being answered → who to notify (the reviewer).
    const { data: review } = await supabaseAdmin
      .from("store_reviews")
      .select("user_id, store_id")
      .eq("id", reviewId)
      .maybeSingle();
    if (!review) return NextResponse.json({ ok: true });

    const { data: store } = await supabaseAdmin
      .from("fish_stores")
      .select("name, slug, claimed_by")
      .eq("id", review.store_id)
      .maybeSingle();
    if (!store) return NextResponse.json({ ok: true });

    // Only when the actual owner responded, and never notify yourself.
    if (resp.user_id !== store.claimed_by) return NextResponse.json({ ok: true });
    if (review.user_id === resp.user_id) return NextResponse.json({ ok: true });

    await supabaseAdmin.from("notifications").insert({
      user_id: review.user_id,
      type: "review_response",
      title: `${store.name} responded`,
      body: "The shop replied to your review. Tap to see what they said.",
      link: `/stores/${store.slug}`,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
