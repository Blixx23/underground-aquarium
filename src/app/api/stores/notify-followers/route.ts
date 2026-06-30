import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { postId } = await request.json();
    if (!postId || typeof postId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { data: post } = await supabaseAdmin
      .from("store_posts")
      .select("id, store_id, user_id, title, created_at")
      .eq("id", postId)
      .maybeSingle();
    if (!post) return NextResponse.json({ ok: true });

    // Only fan out for a freshly-created post (guards against replays).
    const ageMs = Date.now() - new Date(post.created_at as string).getTime();
    if (ageMs > 10 * 60 * 1000) return NextResponse.json({ ok: true });

    const { data: store } = await supabaseAdmin
      .from("fish_stores")
      .select("name, slug, status")
      .eq("id", post.store_id)
      .maybeSingle();
    // Only published shops notify their followers.
    if (!store || store.status !== "published") {
      return NextResponse.json({ ok: true });
    }

    // Everyone who favorited (follows) this shop.
    const { data: favs } = await supabaseAdmin
      .from("store_favorites")
      .select("user_id")
      .eq("fish_store_id", post.store_id);

    const followerIds = Array.from(
      new Set(
        (favs ?? [])
          .map((f) => f.user_id as string)
          .filter((id) => id && id !== post.user_id) // never notify the poster
      )
    );
    if (followerIds.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 });
    }

    const title = (post.title as string | null)?.trim();
    const rows = followerIds.map((uid) => ({
      user_id: uid,
      type: "store_post",
      title: `${store.name} posted an update`,
      body: title ? title : "Tap to see what's new at the shop.",
      link: `/stores/${store.slug}`,
    }));

    await supabaseAdmin.from("notifications").insert(rows);

    return NextResponse.json({ ok: true, notified: followerIds.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
