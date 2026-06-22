import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Action = "remove" | "resolve" | "dismiss" | "hide_post" | "hide_thread";

const VALID: Action[] = [
  "remove",
  "resolve",
  "dismiss",
  "hide_post",
  "hide_thread",
];

// Notifications are best-effort: a failed insert should never roll back or
// block the moderation action itself. Required columns are user_id/type/title.
async function notify(
  userId: string | null | undefined,
  type: string,
  title: string,
  body: string | null,
  link: string | null
) {
  if (!userId) return;
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      link,
    });
  } catch {
    // swallow — see note above
  }
}

export async function POST(req: Request) {
  let parsed: { id?: string; action?: string };
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id } = parsed;
  const action = parsed.action as Action | undefined;
  if (!id || !action || !VALID.includes(action)) {
    return NextResponse.json(
      { error: "Missing report or action." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select(
      "id, status, reporter_id, target_type, target_id, target_label, target_url, reason"
    )
    .eq("id", id)
    .maybeSingle();
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const targetType = (report.target_type as string | null) ?? "";
  const targetId = (report.target_id as string | null) ?? null;
  const targetLabel =
    (report.target_label as string | null) ?? "the reported item";
  const targetUrl = (report.target_url as string | null) ?? null;
  const reporterId = (report.reporter_id as string | null) ?? null;
  const reason = (report.reason as string | null) ?? null;

  const now = new Date().toISOString();

  let actionTaken = false;
  let reportedUserId: string | null = null;
  let reportedTitle = "";
  let reportedBody: string | null = null;
  let reportedLink: string | null = null;

  if (action === "remove") {
    if (targetType === "listing" && targetId) {
      // Find the listing's owner (for their notification), then hide it.
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, store_id")
        .eq("id", targetId)
        .maybeSingle();
      if (product) {
        await supabaseAdmin
          .from("products")
          .update({ is_active: false })
          .eq("id", targetId);
        actionTaken = true;

        const storeId = (product.store_id as string | null) ?? null;
        if (storeId) {
          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("owner_id")
            .eq("id", storeId)
            .maybeSingle();
          reportedUserId = (store?.owner_id as string | null) ?? null;
        }
        reportedTitle = "Listing removed";
        reportedBody = `Your listing ${targetLabel} was removed by a moderator.`;
        reportedLink = "/sell/listings";
      }
    } else if (targetType === "profile" && targetId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          suspended_at: now,
          suspended_reason: reason,
          suspended_by: user.id,
        })
        .eq("id", targetId);
      actionTaken = true;
      reportedUserId = targetId;

      // Hide their active listings and public tanks, mirroring the
      // content-hiding done during account deletion.
      const { data: stores } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", targetId);
      const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);
      if (storeIds.length > 0) {
        await supabaseAdmin
          .from("products")
          .update({ is_active: false })
          .in("store_id", storeIds)
          .is("archived_at", null);
      }
      await supabaseAdmin
        .from("tanks")
        .update({ is_public: false })
        .eq("user_id", targetId);

      reportedTitle = "Account suspended";
      reportedBody = "Your account has been suspended by a moderator.";
      reportedLink = "/account";
    }
  } else if (action === "hide_post" || action === "hide_thread") {
    // Both come from a forum_post report. target_id is the post id.
    if (targetType === "forum_post" && targetId) {
      const { data: post } = await supabaseAdmin
        .from("forum_posts")
        .select("id, thread_id, author_id, is_op")
        .eq("id", targetId)
        .maybeSingle();
      if (post) {
        const threadId = (post.thread_id as string | null) ?? null;

        if (action === "hide_post") {
          await supabaseAdmin
            .from("forum_posts")
            .update({ hidden_at: now })
            .eq("id", targetId);
          actionTaken = true;
          reportedUserId = (post.author_id as string | null) ?? null;

          // Keep the thread's reply count honest after hiding a comment.
          if (threadId) {
            const { count } = await supabaseAdmin
              .from("forum_posts")
              .select("id", { count: "exact", head: true })
              .eq("thread_id", threadId)
              .eq("is_op", false)
              .is("hidden_at", null);
            await supabaseAdmin
              .from("forum_threads")
              .update({ reply_count: count ?? 0 })
              .eq("id", threadId);
          }

          reportedTitle = "Post hidden";
          reportedBody = "A post of yours was hidden by a moderator.";
          reportedLink = targetUrl;
        } else if (threadId) {
          // hide_thread — hide the whole discussion.
          await supabaseAdmin
            .from("forum_threads")
            .update({ hidden_at: now })
            .eq("id", threadId);
          actionTaken = true;

          const { data: thread } = await supabaseAdmin
            .from("forum_threads")
            .select("author_id")
            .eq("id", threadId)
            .maybeSingle();
          reportedUserId = (thread?.author_id as string | null) ?? null;
          reportedTitle = "Thread hidden";
          reportedBody = "A thread of yours was hidden by a moderator.";
          reportedLink = "/forums";
        }
      }
    }
  }

  const newStatus = action === "dismiss" ? "dismissed" : "resolved";
  const { error: updErr } = await supabaseAdmin
    .from("reports")
    .update({ status: newStatus, reviewed_at: now, reviewed_by: user.id })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Tell the reporter the outcome.
  if (reporterId) {
    if (action === "dismiss") {
      await notify(
        reporterId,
        "report",
        "Report reviewed",
        `We reviewed your report about ${targetLabel}. No action was needed.`,
        targetUrl
      );
    } else if (actionTaken) {
      await notify(
        reporterId,
        "report",
        "Report resolved",
        `Thanks — we took action on ${targetLabel}, which you reported.`,
        targetUrl
      );
    } else {
      await notify(
        reporterId,
        "report",
        "Report resolved",
        `Your report about ${targetLabel} has been resolved.`,
        targetUrl
      );
    }
  }

  // Tell the reported person only when real action was taken — and never
  // double-notify someone who reported their own content.
  if (actionTaken && reportedUserId && reportedUserId !== reporterId) {
    await notify(
      reportedUserId,
      "moderation",
      reportedTitle,
      reportedBody,
      reportedLink
    );
  }

  return NextResponse.json({ ok: true, actionTaken });
}
