import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  MAX_OPENER,
  MAX_REPLY,
  MAX_TITLE,
  MIN_TITLE,
  tooLongMessage,
} from "@/lib/forum/limits";

// Editing and deleting forum posts.
//
//   PATCH  { post_id, body, title? }  edit a post (title only for the opener)
//   DELETE { post_id }                delete a reply, or the whole thread
//                                     when it's the opening post
//
// Only the post's author or an admin may do either. RLS would block most of
// these writes for ordinary members, so we check permission here in code and
// then write with the service role client.

type PostRow = {
  id: string;
  thread_id: string;
  author_id: string | null;
  is_op: boolean;
  hidden_at: string | null;
};

type ThreadRow = {
  id: string;
  slug: string;
  category_id: string;
  images: unknown;
  is_locked: boolean | null;
  hidden_at: string | null;
};

/** Supabase errors are plain objects, so read the message off whatever came back. */
function errorText(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; details?: unknown };
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.details === "string" && e.details) return e.details;
  }
  return fallback;
}

/**
 * Loads the post, its thread and the caller, and decides whether the caller
 * may change it. Returns either everything needed or a ready-made error reply.
 */
async function authorize(postId: string | undefined) {
  if (!postId) {
    return { fail: NextResponse.json({ error: "Missing post." }, { status: 400 }) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { fail: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = Boolean(me?.is_admin);

  const { data: post } = await supabaseAdmin
    .from("forum_posts")
    .select("id, thread_id, author_id, is_op, hidden_at")
    .eq("id", postId)
    .maybeSingle<PostRow>();
  if (!post) {
    return { fail: NextResponse.json({ error: "Post not found." }, { status: 404 }) };
  }

  const { data: thread } = await supabaseAdmin
    .from("forum_threads")
    .select("id, slug, category_id, images, is_locked, hidden_at")
    .eq("id", post.thread_id)
    .maybeSingle<ThreadRow>();
  if (!thread) {
    return { fail: NextResponse.json({ error: "Thread not found." }, { status: 404 }) };
  }

  // Already removed (by its author or a moderator): treat it as gone.
  if (post.hidden_at || thread.hidden_at) {
    return { fail: NextResponse.json({ error: "That post has been removed." }, { status: 404 }) };
  }

  const isAuthor = Boolean(post.author_id) && post.author_id === user.id;
  if (!isAuthor && !isAdmin) {
    return {
      fail: NextResponse.json(
        { error: "You can only change your own posts." },
        { status: 403 }
      ),
    };
  }

  return { user, isAdmin, post, thread };
}

/** Clears the cached pages that show this thread so the change appears right away. */
async function refreshPages(thread: ThreadRow) {
  const { data: cat } = await supabaseAdmin
    .from("forum_categories")
    .select("slug")
    .eq("id", thread.category_id)
    .maybeSingle();
  if (cat?.slug) {
    revalidatePath(`/forums/${cat.slug}/${thread.slug}`);
    revalidatePath(`/forums/${cat.slug}`);
  }
  revalidatePath("/forums");
}

export async function PATCH(req: Request) {
  let payload: { post_id?: string; body?: unknown; title?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const auth = await authorize(payload.post_id);
  if ("fail" in auth) return auth.fail;
  const { isAdmin, post, thread } = auth;

  // A lock freezes the discussion as it stands, so only admins may edit
  // inside a locked thread. Authors can still delete their own posts.
  if (thread.is_locked && !isAdmin) {
    return NextResponse.json({ error: "This thread is locked." }, { status: 403 });
  }

  const text = typeof payload.body === "string" ? payload.body.trim() : "";
  const max = post.is_op ? MAX_OPENER : MAX_REPLY;
  if (text.length > max) {
    return NextResponse.json(
      { error: tooLongMessage(post.is_op ? "Your post" : "Your reply", text.length, max) },
      { status: 400 }
    );
  }

  // An opening post may be photo-only; a reply always needs words.
  const hasImages = Array.isArray(thread.images) && thread.images.length > 0;
  if (!text && !(post.is_op && hasImages)) {
    return NextResponse.json(
      { error: post.is_op ? "Add some text, or keep a photo on the post." : "Write something first." },
      { status: 400 }
    );
  }

  // Only the opening post carries the thread title.
  let title: string | null = null;
  if (post.is_op && typeof payload.title === "string") {
    title = payload.title.trim();
    if (title.length < MIN_TITLE) {
      return NextResponse.json(
        { error: `A title of at least ${MIN_TITLE} characters is required.` },
        { status: 400 }
      );
    }
    if (title.length > MAX_TITLE) {
      return NextResponse.json(
        { error: tooLongMessage("The title", title.length, MAX_TITLE) },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();

  // edited_at comes from sql/step58_fixes.sql. If that hasn't been run yet,
  // save the edit anyway rather than failing; it just won't say "(edited)".
  let { error: postErr } = await supabaseAdmin
    .from("forum_posts")
    .update({ body: text, edited_at: now })
    .eq("id", post.id);
  if (postErr && errorText(postErr, "").includes("edited_at")) {
    ({ error: postErr } = await supabaseAdmin
      .from("forum_posts")
      .update({ body: text })
      .eq("id", post.id));
  }
  if (postErr) {
    return NextResponse.json(
      { error: errorText(postErr, "Couldn't save your changes.") },
      { status: 500 }
    );
  }

  if (title !== null) {
    // The slug (and so the link) stays the same, so shared links keep working.
    const { error: titleErr } = await supabaseAdmin
      .from("forum_threads")
      .update({ title })
      .eq("id", thread.id);
    if (titleErr) {
      return NextResponse.json(
        { error: errorText(titleErr, "Saved the post, but couldn't change the title.") },
        { status: 500 }
      );
    }
  }

  await refreshPages(thread);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  let payload: { post_id?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const auth = await authorize(payload.post_id);
  if ("fail" in auth) return auth.fail;
  const { post, thread } = auth;
  const now = new Date().toISOString();

  if (post.is_op) {
    // Deleting the opening post takes the whole thread down, the same way a
    // moderator's "hide thread" does: it stops showing anywhere on the site.
    const { error } = await supabaseAdmin
      .from("forum_threads")
      .update({ hidden_at: now })
      .eq("id", thread.id);
    if (error) {
      return NextResponse.json(
        { error: errorText(error, "Couldn't delete the thread.") },
        { status: 500 }
      );
    }
    await refreshPages(thread);
    return NextResponse.json({ ok: true, thread_deleted: true });
  }

  // A reply is hidden rather than erased, matching moderation. Replies to it
  // stay up (they belong to other people) and move up a level on the page.
  const { error } = await supabaseAdmin
    .from("forum_posts")
    .update({ hidden_at: now })
    .eq("id", post.id);
  if (error) {
    return NextResponse.json(
      { error: errorText(error, "Couldn't delete the reply.") },
      { status: 500 }
    );
  }

  // Recount from scratch so the "N comments" number matches what's visible.
  const { count } = await supabaseAdmin
    .from("forum_posts")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", thread.id)
    .eq("is_op", false)
    .is("hidden_at", null);
  await supabaseAdmin
    .from("forum_threads")
    .update({ reply_count: count ?? 0 })
    .eq("id", thread.id);

  await refreshPages(thread);
  return NextResponse.json({ ok: true });
}
