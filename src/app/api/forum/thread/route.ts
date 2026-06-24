import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardBubbles } from "@/lib/awardBubbles";
import { checkPostMilestones } from "@/lib/bubbleMilestones";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export async function POST(req: Request) {
  let payload: {
    category?: string;
    title?: string;
    body?: string;
    images?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const categorySlug = payload.category;
  const title = (payload.title ?? "").trim();
  const text = (payload.body ?? "").trim();

  if (!categorySlug || title.length < 3) {
    return NextResponse.json(
      { error: "A title of at least 3 characters is required." },
      { status: 400 }
    );
  }
  const imagesRaw = Array.isArray(payload.images) ? payload.images : [];
  if (!text && imagesRaw.length === 0) {
    return NextResponse.json(
      { error: "Add some text or a photo." },
      { status: 400 }
    );
  }
  if (title.length > 160) {
    return NextResponse.json({ error: "Title is too long." }, { status: 400 });
  }

  // Only accept real, public URLs from our own forum-images bucket, capped at 4.
  const bucketPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forum-images/`;
  const images = Array.isArray(payload.images)
    ? (payload.images as unknown[])
        .filter((u): u is string => typeof u === "string" && u.startsWith(bucketPrefix))
        .slice(0, 4)
    : [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to post." }, { status: 401 });
  }

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("id, slug, is_public")
    .eq("slug", categorySlug)
    .maybeSingle();
  if (!cat || !cat.is_public) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  const slug = `${slugify(title) || "thread"}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const { data: thread, error: threadErr } = await supabase
    .from("forum_threads")
    .insert({
      category_id: cat.id,
      author_id: user.id,
      slug,
      title,
      images,
      is_seeded: false,
    })
    .select("id")
    .maybeSingle();
  if (threadErr || !thread) {
    return NextResponse.json(
      { error: threadErr?.message ?? "Couldn't create the thread." },
      { status: 500 }
    );
  }

  const { error: postErr } = await supabase.from("forum_posts").insert({
    thread_id: thread.id,
    author_id: user.id,
    body: text.slice(0, 20000) || "",
    is_op: true,
    parent_id: null,
  });
  if (postErr) {
    // Don't leave an empty thread behind.
    await supabase.from("forum_threads").delete().eq("id", thread.id);
    return NextResponse.json({ error: postErr.message }, { status: 500 });
  }

  await awardBubbles(user.id, "first_thread");
  await awardBubbles(user.id, "first_post");
  await checkPostMilestones(user.id);

  return NextResponse.json({ ok: true, category: cat.slug, slug });
}
