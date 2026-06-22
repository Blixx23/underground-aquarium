import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  let body: { thread_id?: string; parent_id?: string | null; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const threadId = body.thread_id;
  const parentId = body.parent_id ?? null;
  const text = (body.body ?? "").trim();
  if (!threadId || !text) {
    return NextResponse.json(
      { error: "A thread and a message are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, slug, title, is_locked, author_id, category_id")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }
  if (thread.is_locked) {
    return NextResponse.json({ error: "This thread is locked." }, { status: 403 });
  }

  // Who gets the "new reply" notification: the parent comment's author for a
  // nested reply, otherwise the thread's author.
  let recipient = thread.author_id as string | null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("forum_posts")
      .select("author_id, thread_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.thread_id !== threadId) {
      return NextResponse.json({ error: "Bad parent." }, { status: 400 });
    }
    recipient = parent.author_id as string | null;
  }

  const { error } = await supabase.from("forum_posts").insert({
    thread_id: threadId,
    author_id: user.id,
    body: text.slice(0, 10000),
    is_op: false,
    parent_id: parentId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort reply notification (never to yourself).
  if (recipient && recipient !== user.id) {
    try {
      const { data: cat } = await supabaseAdmin
        .from("forum_categories")
        .select("slug")
        .eq("id", thread.category_id)
        .maybeSingle();
      const link = cat?.slug
        ? `/forums/${cat.slug}/${thread.slug}`
        : "/notifications";
      await supabaseAdmin.from("notifications").insert({
        user_id: recipient,
        type: "forum",
        title: "New reply",
        body: thread.title
          ? `New reply on “${thread.title}.”`
          : "You have a new reply.",
        link,
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}
