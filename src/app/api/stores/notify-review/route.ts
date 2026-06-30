import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { reviewId } = await request.json();
    if (!reviewId || typeof reviewId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { data: review } = await supabaseAdmin
      .from("store_reviews")
      .select("id, store_id, user_id, rating, created_at")
      .eq("id", reviewId)
      .maybeSingle();
    if (!review) return NextResponse.json({ ok: true });

    // Only notify for very recent reviews (guards against replays).
    const ageMs = Date.now() - new Date(review.created_at as string).getTime();
    if (ageMs > 10 * 60 * 1000) return NextResponse.json({ ok: true });

    const { data: store } = await supabaseAdmin
      .from("fish_stores")
      .select("name, slug, claimed_by")
      .eq("id", review.store_id)
      .maybeSingle();
    // Only a claimed shop has an owner to notify.
    if (!store || !store.claimed_by) return NextResponse.json({ ok: true });
    // Safety: never notify the owner about their own action.
    if (store.claimed_by === review.user_id) {
      return NextResponse.json({ ok: true });
    }

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name")
      .eq("id", review.user_id)
      .maybeSingle();
    const reviewerName =
      (prof?.full_name as string) || (prof?.username as string) || "An aquarist";

    const rating = review.rating as number;

    await supabaseAdmin.from("notifications").insert({
      user_id: store.claimed_by,
      type: "review",
      title: `New ${rating}-star review`,
      body: `${reviewerName} reviewed ${store.name}. Tap to read and respond.`,
      link: `/stores/${store.slug}`,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
