import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminUnlocked, LOCKED_MESSAGE } from "@/lib/admin/unlockCheck";
import { suspendMember } from "@/app/api/admin/members/_lib/suspension";

/**
 * Quick moderation from a forum thread, without going through a report:
 *  - archive_post:   hide one reply (same as "Hide post" in /admin/reports)
 *  - archive_thread: hide the whole thread (same as "Hide thread")
 *  - suspend:        suspend the post's author (same as suspending from a
 *                    profile report: sign-in blocked, ads down, tanks private;
 *                    undo from Suspended accounts on /admin/reports)
 * Archiving sets hidden_at, so nothing is deleted. Admins only, and only after
 * unlocking the admin area on this device, like editing someone else's post.
 */
type Body = { action?: string; post_id?: string; reason?: string };

async function notify(userId: string | null, title: string, body: string, link: string | null) {
  if (!userId) return;
  try {
    await supabaseAdmin.from("notifications").insert({ user_id: userId, type: "moderation", title, body, link });
  } catch {
    /* best-effort */
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const action = body.action ?? "";
  const postId = typeof body.post_id === "string" ? body.post_id : "";
  if (!["archive_post", "archive_thread", "suspend"].includes(action) || !postId) {
    return NextResponse.json({ error: "Missing action or post." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  if (!(await adminUnlocked(user.id))) return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 403 });

  const { data: post } = await supabaseAdmin
    .from("forum_posts")
    .select("id, thread_id, author_id, is_op")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "That post no longer exists." }, { status: 404 });
  const { data: thread } = await supabaseAdmin
    .from("forum_threads")
    .select("id, slug, category_id, author_id")
    .eq("id", post.thread_id)
    .maybeSingle();
  const { data: cat } = thread
    ? await supabaseAdmin.from("forum_categories").select("slug").eq("id", thread.category_id).maybeSingle()
    : { data: null };
  const threadPath = cat?.slug && thread?.slug ? `/forums/${cat.slug}/${thread.slug}` : null;

  const refresh = () => {
    if (threadPath) revalidatePath(threadPath);
    if (cat?.slug) revalidatePath(`/forums/${cat.slug}`);
    revalidatePath("/forums");
    revalidatePath("/feed");
  };
  const now = new Date().toISOString();

  if (action === "archive_post") {
    if (post.is_op) {
      return NextResponse.json({ error: "That's the opening post. Archive the thread instead." }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("forum_posts").update({ hidden_at: now }).eq("id", postId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Keep the thread's reply count honest.
    const { count } = await supabaseAdmin
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", post.thread_id)
      .eq("is_op", false)
      .is("hidden_at", null);
    await supabaseAdmin.from("forum_threads").update({ reply_count: count ?? 0 }).eq("id", post.thread_id);
    await notify(post.author_id, "Post hidden", "A post of yours was hidden by a moderator.", threadPath);
    refresh();
    return NextResponse.json({ ok: true });
  }

  if (action === "archive_thread") {
    if (!thread) return NextResponse.json({ error: "That thread no longer exists." }, { status: 404 });
    const { error } = await supabaseAdmin.from("forum_threads").update({ hidden_at: now }).eq("id", thread.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notify(thread.author_id, "Thread hidden", "A thread of yours was hidden by a moderator.", "/forums");
    refresh();
    return NextResponse.json({ ok: true, redirect: cat?.slug ? `/forums/${cat.slug}` : "/forums" });
  }

  // suspend
  const memberId = post.author_id as string | null;
  if (!memberId) return NextResponse.json({ error: "That post has no author to suspend." }, { status: 400 });
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 300) : "Suspended from a forum post";
  const err = await suspendMember(memberId, user.id, reason);
  if (err) return NextResponse.json({ error: err }, { status: 500 });
  await notify(
    memberId,
    "Account suspended",
    "Your account has been suspended by a moderator. If you think this is a mistake, email support@undergroundaquarium.com.",
    "/account-suspended"
  );
  refresh();
  return NextResponse.json({ ok: true });
}
