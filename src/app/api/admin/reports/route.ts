import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  REMOVED_LISTING_STATUS,
  suspendMember,
} from "../members/_lib/suspension";

type Action =
  | "remove"
  | "resolve"
  | "dismiss"
  | "hide_post"
  | "hide_thread"
  | "remove_feed_post";

const VALID: Action[] = [
  "remove",
  "remove_feed_post",
  "resolve",
  "dismiss",
  "hide_post",
  "hide_thread",
];

// Supabase errors are plain objects, so read the message field directly.
function errText(err: unknown): string {
  const e = err as { message?: string; details?: string } | null;
  return e?.message || e?.details || "Unknown error.";
}

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
    // swallow, see note above
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
      // Classified ads live in `listings`. Taking one down sets the same
      // "removed" status My listings already knows about: it disappears from
      // the marketplace and search, the seller still sees it (marked
      // removed) and there is no Repost button for it.
      const { data: listing } = await supabaseAdmin
        .from("listings")
        .select("id, user_id, title")
        .eq("id", targetId)
        .maybeSingle();
      if (listing) {
        const { error: listErr } = await supabaseAdmin
          .from("listings")
          .update({ status: REMOVED_LISTING_STATUS })
          .eq("id", targetId);
        if (listErr) {
          return NextResponse.json(
            { error: `Couldn't take the listing down: ${errText(listErr)}` },
            { status: 500 }
          );
        }
        actionTaken = true;
        reportedUserId = (listing.user_id as string | null) ?? null;
        const title = (listing.title as string | null) ?? targetLabel;
        reportedTitle = "Listing removed";
        reportedBody = `Your listing "${title}" was removed by a moderator.`;
        reportedLink = "/my/listings";
      } else {
        // Reports filed before the move to free classifieds pointed at the
        // old paid `products` table. Those products are no longer shown
        // anywhere, but switching one off keeps an old report honest.
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
          reportedLink = "/my/listings";
        }
      }
      if (!actionTaken) {
        return NextResponse.json(
          {
            error:
              "That listing no longer exists, so there is nothing to take down. Use Mark resolved or Dismiss.",
          },
          { status: 404 }
        );
      }
    } else if (targetType === "profile" && targetId) {
      // Blocks sign-in, takes down live ads and makes tanks private. See
      // suspendMember for the details and how it is undone.
      const suspendErr = await suspendMember(targetId, user.id, reason);
      if (suspendErr) {
        return NextResponse.json({ error: suspendErr }, { status: 500 });
      }
      actionTaken = true;
      reportedUserId = targetId;
      reportedTitle = "Account suspended";
      reportedBody =
        "Your account has been suspended by a moderator. If you think this is a mistake, email support@undergroundaquarium.com.";
      // They can't sign in any more, so point at the public explanation.
      reportedLink = "/account-suspended";
    }
  } else if (action === "remove_feed_post") {
    if (targetType === "feed_post" && targetId) {
      const { data: post } = await supabaseAdmin
        .from("feed_posts")
        .select("user_id")
        .eq("id", targetId)
        .maybeSingle();
      if (!post) {
        return NextResponse.json(
          {
            error:
              "That post was already deleted. Use Mark resolved or Dismiss.",
          },
          { status: 404 }
        );
      }
      // Same path as the "Delete post" menu item an admin sees on the feed:
      // the delete_feed_post database function. It checks who is calling, so
      // it runs with the admin's own session rather than the service role.
      const { error: delErr } = await supabase.rpc("delete_feed_post", {
        p_id: targetId,
      });
      if (delErr) {
        return NextResponse.json(
          { error: `Couldn't remove the post: ${errText(delErr)}` },
          { status: 500 }
        );
      }
      actionTaken = true;
      reportedUserId = (post.user_id as string | null) ?? null;
      reportedTitle = "Post removed";
      reportedBody = "A post of yours in the feed was removed by a moderator.";
      // The post is gone, so link to the feed rather than a dead page.
      reportedLink = "/feed";
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
          // hide_thread: hide the whole discussion.
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
        `Thanks, we took action on ${targetLabel}, which you reported.`,
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

  // Tell the reported person only when real action was taken, and never
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
