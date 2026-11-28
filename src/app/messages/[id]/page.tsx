import type { Metadata } from "next";
import Link from "next/link";
import BlockButton from "@/components/BlockButton";
import { notFound } from "next/navigation";
import { ArrowLeft, Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, timeAgo } from "@/lib/marketplace/listings";
import MarkSoldButton from "@/components/marketplace/MarkSoldButton";
import MessageComposer from "@/components/messages/MessageComposer";
import MarkThreadRead from "@/components/messages/MarkThreadRead";
import Avatar from "@/components/profile/Avatar";
import LiveThread from "@/components/messages/LiveThread";
import ArchiveThreadButton from "@/components/messages/ArchiveThreadButton";
import ReportButton from "@/components/ReportButton";
import { PHOTO_ONLY_BODY, QUICK_REPLIES, looksLikePaymentTalk } from "@/lib/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="font-display text-2xl text-white mb-4">
            Sign in to read this conversation
          </h1>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  // RLS means a non-participant simply gets nothing back here.
  const { data: threadData } = await supabase
    .from("listing_threads")
    .select(
      "id, listing_id, buyer_id, seller_id, last_message_at, buyer_last_read_at, seller_last_read_at, buyer_archived_at, seller_archived_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!threadData) notFound();
  const thread = threadData as unknown as {
    id: string;
    listing_id: string | null;
    buyer_id: string;
    seller_id: string;
    last_message_at: string;
    buyer_last_read_at: string | null;
    seller_last_read_at: string | null;
    buyer_archived_at: string | null;
    seller_archived_at: string | null;
  };

  const isBuyer = thread.buyer_id === user.id;
  const otherId = isBuyer ? thread.seller_id : thread.buyer_id;

  const [{ data: messageData }, { data: listingData }, { data: otherData }] =
    await Promise.all([
      supabase
        .from("listing_messages")
        .select("id, sender_id, body, images, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true })
        .limit(500),
      thread.listing_id
        ? supabase
            .from("listings")
            .select("id, title, slug, images, price_cents, is_wanted, status")
            .eq("id", thread.listing_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", otherId)
        .maybeSingle(),
    ]);

  const messages = (messageData ?? []) as unknown as {
    id: string;
    sender_id: string;
    body: string;
    images: string[] | null;
    created_at: string;
  }[];

  const listing = listingData as unknown as {
    id: string;
    title: string;
    slug: string;
    images: string[] | null;
    price_cents: number | null;
    is_wanted: boolean;
    status: string;
  } | null;

  const other = otherData as {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  const direct = !thread.listing_id;
  const otherName = (direct ? other?.full_name?.trim() : null) || other?.username || "A hobbyist";

  const now = Date.now();
  const image = listing?.images?.[0];

  // "Seen" goes under my latest message once the other person has opened the chat after it.
  const theirRead = isBuyer ? thread.seller_last_read_at : thread.buyer_last_read_at;
  const lastMine = [...messages].reverse().find((m) => m.sender_id === user.id);
  const lastIsMine = messages.length > 0 && messages[messages.length - 1].sender_id === user.id;
  const seen = !!lastMine && !!theirRead && new Date(theirRead).getTime() >= new Date(lastMine.created_at).getTime();

  // Archived for me, and nothing new has arrived since.
  const myArchived = isBuyer ? thread.buyer_archived_at : thread.seller_archived_at;
  const archived = !!myArchived && new Date(myArchived).getTime() >= new Date(thread.last_message_at).getTime();

  // Their recent words, so a report shows Chris what was actually said.
  const theirRecent = messages
    .filter((m) => m.sender_id === otherId && m.body !== PHOTO_ONLY_BODY)
    .slice(-3)
    .map((m) => m.body.replace(/\s+/g, " "))
    .join(" / ");

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <MarkThreadRead threadId={thread.id} role={isBuyer ? "buyer" : "seller"} stamp={messages.length} />
      <LiveThread threadId={thread.id} messageCount={messages.length} />

      <div className="max-w-3xl mx-auto">
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          All messages
        </Link>

        {/* What this conversation is about: a person, or a listing */}
        {direct ? (
          <div className="flex items-center gap-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-4 mb-8">
            <Avatar name={otherName} src={other?.avatar_url ?? null} size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ocean-500 mb-0.5">Direct message</p>
              {other?.username ? (
                <Link
                  href={`/u/${other.username}`}
                  className="block truncate text-white hover:text-ocean-200 transition-colors"
                >
                  {otherName}
                </Link>
              ) : (
                <p className="truncate text-white">{otherName}</p>
              )}
              {other?.username && <p className="text-sm text-ocean-500">@{other.username}</p>}
            </div>
          </div>
        ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-4 mb-8">
          <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-ocean-950 border border-ocean-800/60 flex items-center justify-center">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Fish className="w-6 h-6 text-ocean-700" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ocean-500 mb-0.5">
              With <span className="text-ocean-300">{otherName}</span>
            </p>
            {listing ? (
              <Link
                href={`/listing/${listing.slug}`}
                className="block truncate text-white hover:text-ocean-200 transition-colors"
              >
                {listing.title}
              </Link>
            ) : (
              <p className="text-ocean-400">Listing removed</p>
            )}
            {listing && !listing.is_wanted && (
              <p className="text-sm text-ocean-500">
                {formatPrice(listing.price_cents)}
                {listing.status === "sold" ? " · sold" : listing.status !== "active" && " · no longer listed"}
              </p>
            )}
            {listing && !isBuyer && listing.status === "active" && (
              <MarkSoldButton listingId={listing.id} isWanted={listing.is_wanted} compact />
            )}
          </div>
        </div>
        )}

        {/* Messages */}
        <div className="space-y-3 mb-8">
          {messages.map((m) => {
            const mine = m.sender_id === user.id;
            const photos = m.images ?? [];
            const text = photos.length && m.body === PHOTO_ONLY_BODY ? "" : m.body;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    mine
                      ? "bg-ocean-700/70 border border-ocean-600/50"
                      : "bg-ocean-900/70 border border-ocean-800/60"
                  }`}
                >
                  {photos.length > 0 && (
                    <div className={`grid gap-1.5 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${text ? "mb-2" : ""}`}>
                      {photos.map((src) => (
                        <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="Photo" loading="lazy" className="max-h-72 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {text && (
                    <p className="text-ocean-50 text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>
                  )}
                  <p className={`text-[11px] mt-1.5 ${mine ? "text-ocean-300" : "text-ocean-600"}`}>
                    {mine ? "You" : otherName} · {timeAgo(m.created_at, now)}
                  </p>
                </div>
                {/* A gentle nudge when the other person brings up payment apps, deposits or shipping. */}
                {!mine && looksLikePaymentTalk(m.body) && (
                  <p className="mt-1 max-w-[80%] rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] leading-snug text-amber-200">
                    Tip: paying in person at pickup is safest. Never send gift cards or a deposit to someone you haven&apos;t met.
                  </p>
                )}
                {mine && m.id === lastMine?.id && lastIsMine && (
                  <p className="mt-1 text-[11px] text-ocean-500">{seen ? "Seen" : "Sent"}</p>
                )}
              </div>
            );
          })}
          <div id="thread-end" className="scroll-mb-40" />
        </div>

        <MessageComposer
          threadId={thread.id}
          placeholder={`Reply to ${otherName}…`}
          quickReplies={direct ? undefined : isBuyer ? QUICK_REPLIES.buyer : QUICK_REPLIES.seller}
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <BlockButton userId={otherId} name={otherName} />
          <ReportButton
            targetType="profile"
            targetId={otherId}
            targetLabel={`Messages from ${otherName}${theirRecent ? `: "${theirRecent.slice(0, 240)}"` : ""}`}
            targetUrl={other?.username ? `/u/${other.username}` : null}
          />
          <ArchiveThreadButton threadId={thread.id} role={isBuyer ? "buyer" : "seller"} archived={archived} />
        </div>

        <p className="text-xs text-ocean-600 mt-6 leading-relaxed">
          Keep the conversation on the site until you agree to meet. Underground
          Aquarium doesn&apos;t handle payment for free listings, so never wire
          money or send gift cards to someone you haven&apos;t met.
        </p>
      </div>
    </main>
  );
}
