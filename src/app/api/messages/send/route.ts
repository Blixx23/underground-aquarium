import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail, emailLayout } from "@/lib/email";
import { MESSAGING_ENABLED } from "@/lib/config";

export const dynamic = "force-dynamic";

const SITE = "https://www.undergroundaquarium.com";
const MAX_BODY = 4000;

// Anti-spam: how many messages one account may send in a rolling window.
const RATE_WINDOW_MINUTES = 10;
const RATE_LIMIT = 25;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  if (!MESSAGING_ENABLED) {
    return NextResponse.json(
      { error: "Messaging isn't switched on yet." },
      { status: 410 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to send a message." },
        { status: 401 }
      );
    }

    const payload = (await request.json()) as {
      listingSlug?: string;
      threadId?: string;
      /** Starting a direct conversation with a person (no listing). */
      toUserId?: string;
      body?: string;
    };

    const body = (payload.body ?? "").trim();
    if (!body) {
      return NextResponse.json({ error: "Write a message first." }, { status: 400 });
    }
    if (body.length > MAX_BODY) {
      return NextResponse.json(
        { error: `Messages are capped at ${MAX_BODY} characters.` },
        { status: 400 }
      );
    }

    // Rate limit before doing any writes.
    const since = new Date(
      Date.now() - RATE_WINDOW_MINUTES * 60 * 1000
    ).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("listing_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", since);
    if ((recentCount ?? 0) >= RATE_LIMIT) {
      return NextResponse.json(
        { error: "You're sending messages very quickly. Take a short break and try again." },
        { status: 429 }
      );
    }

    let threadId: string;
    let recipientId: string;
    let listingId: string | null;

    if (payload.threadId) {
      // Replying in an existing conversation.
      const { data: thread } = await supabaseAdmin
        .from("listing_threads")
        .select("id, listing_id, buyer_id, seller_id")
        .eq("id", payload.threadId)
        .maybeSingle();
      if (!thread) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      }
      if (thread.buyer_id !== user.id && thread.seller_id !== user.id) {
        return NextResponse.json({ error: "Not your conversation." }, { status: 403 });
      }

      threadId = thread.id as string;
      listingId = (thread.listing_id as string | null) ?? null;
      recipientId =
        thread.buyer_id === user.id
          ? (thread.seller_id as string)
          : (thread.buyer_id as string);
    } else if (payload.listingSlug) {
      // First message about a listing.
      const { data: listing } = await supabaseAdmin
        .from("listings")
        .select("id, user_id, title, slug, status, allow_messages")
        .eq("slug", payload.listingSlug)
        .maybeSingle();
      if (!listing || listing.status !== "active") {
        return NextResponse.json(
          { error: "That listing isn't available." },
          { status: 404 }
        );
      }
      if (!listing.allow_messages) {
        return NextResponse.json(
          { error: "This poster has messages turned off." },
          { status: 400 }
        );
      }
      if (listing.user_id === user.id) {
        return NextResponse.json(
          { error: "That's your own listing." },
          { status: 400 }
        );
      }

      listingId = listing.id as string;
      recipientId = listing.user_id as string;

      const { data: existing } = await supabaseAdmin
        .from("listing_threads")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", user.id)
        .maybeSingle();

      if (existing) {
        threadId = existing.id as string;
      } else {
        const { data: created, error: threadError } = await supabaseAdmin
          .from("listing_threads")
          .insert({
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: recipientId,
          })
          .select("id")
          .single();
        if (threadError) throw new Error(threadError.message);
        threadId = created.id as string;
      }
    } else if (payload.toUserId) {
      // A direct message to a person. Anyone signed in can start one;
      // blocks are enforced by the database.
      if (payload.toUserId === user.id) {
        return NextResponse.json({ error: "That's you." }, { status: 400 });
      }
      const { data: target } = await supabaseAdmin
        .from("profiles")
        .select("id, deleted_at")
        .eq("id", payload.toUserId)
        .maybeSingle();
      if (!target || target.deleted_at) {
        return NextResponse.json({ error: "That member isn't available." }, { status: 404 });
      }

      listingId = null;
      recipientId = target.id as string;

      // One direct conversation per pair of people, whoever started it.
      const findPair = async () => {
        const { data } = await supabaseAdmin
          .from("listing_threads")
          .select("id")
          .is("listing_id", null)
          .or(
            `and(buyer_id.eq.${user.id},seller_id.eq.${recipientId}),and(buyer_id.eq.${recipientId},seller_id.eq.${user.id})`
          )
          .maybeSingle();
        return (data?.id as string | undefined) ?? null;
      };

      const existingId = await findPair();
      if (existingId) {
        threadId = existingId;
      } else {
        const { data: created, error: threadError } = await supabaseAdmin
          .from("listing_threads")
          .insert({ listing_id: null, buyer_id: user.id, seller_id: recipientId })
          .select("id")
          .single();
        if (threadError) {
          // Two sends at once: the other one made the conversation first.
          const again = threadError.code === "23505" ? await findPair() : null;
          if (!again) throw new Error(threadError.message);
          threadId = again;
        } else {
          threadId = created.id as string;
        }
      }
    } else {
      return NextResponse.json(
        { error: "Nothing to reply to." },
        { status: 400 }
      );
    }

    const { error: messageError } = await supabaseAdmin
      .from("listing_messages")
      .insert({ thread_id: threadId, sender_id: user.id, body });
    if (messageError) throw new Error(messageError.message);

    // The sender has obviously read their own message.
    const { data: thread } = await supabaseAdmin
      .from("listing_threads")
      .select("buyer_id")
      .eq("id", threadId)
      .maybeSingle();
    const senderIsBuyer = thread?.buyer_id === user.id;
    await supabaseAdmin
      .from("listing_threads")
      .update(
        senderIsBuyer
          ? { buyer_last_read_at: new Date().toISOString() }
          : { seller_last_read_at: new Date().toISOString() }
      )
      .eq("id", threadId);

    // --- Notify the other person. Best effort, never blocks the send. ---
    const [{ data: listingRow }, { data: senderProfile }] = await Promise.all([
      listingId
        ? supabaseAdmin.from("listings").select("title, slug").eq("id", listingId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("profiles")
        .select("username, full_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const senderName =
      (senderProfile?.username as string) ||
      (senderProfile?.full_name as string) ||
      "Someone";
    const isDirect = !listingId;
    const listingTitle = (listingRow?.title as string) ?? "your listing";
    const threadLink = `/messages/${threadId}`;

    // No bell notification: new messages show on the Messages icon's
    // unread badge and in the inbox, where they belong. The email below
    // still goes out.

    try {
      const { data: recipientAuth } =
        await supabaseAdmin.auth.admin.getUserById(recipientId);
      const to = recipientAuth?.user?.email;
      if (to) {
        const preview =
          body.length > 300 ? `${body.slice(0, 297)}…` : body;
        await sendEmail({
          to,
          subject: isDirect
            ? `${senderName} sent you a message`
            : `${senderName} messaged you about "${listingTitle}"`,
          html: emailLayout({
            preheader: preview,
            title: `New message from ${senderName}`,
            intro: isDirect
              ? "They messaged you on Underground Aquarium."
              : `About your listing <strong>${escapeHtml(listingTitle)}</strong>.`,
            bodyHtml: `<p style="margin:0;padding:16px 18px;background:#f3f7fa;border:1px solid #e6ecf1;border-radius:12px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0c2740;white-space:pre-wrap;">${escapeHtml(preview)}</p>`,
            cta: { label: "Read and reply", url: `${SITE}${threadLink}` },
            footerNote: isDirect
              ? "You're receiving this because another member messaged you on Underground Aquarium."
              : "You're receiving this because someone replied to a listing you posted on Underground Aquarium.",
          }),
        });
      }
    } catch (mailErr) {
      console.error("Message email failed:", mailErr);
    }

    return NextResponse.json({ ok: true, threadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Message send error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
