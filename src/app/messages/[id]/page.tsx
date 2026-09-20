import type { Metadata } from "next";
import Link from "next/link";
import BlockButton from "@/components/BlockButton";
import { notFound } from "next/navigation";
import { ArrowLeft, Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, timeAgo } from "@/lib/marketplace/listings";
import MessageComposer from "@/components/messages/MessageComposer";
import MarkThreadRead from "@/components/messages/MarkThreadRead";

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
    .select("id, listing_id, buyer_id, seller_id")
    .eq("id", id)
    .maybeSingle();

  if (!threadData) notFound();
  const thread = threadData as unknown as {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
  };

  const isBuyer = thread.buyer_id === user.id;
  const otherId = isBuyer ? thread.seller_id : thread.buyer_id;

  const [{ data: messageData }, { data: listingData }, { data: otherData }] =
    await Promise.all([
      supabase
        .from("listing_messages")
        .select("id, sender_id, body, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true })
        .limit(500),
      supabase
        .from("listings")
        .select("title, slug, images, price_cents, is_wanted, status")
        .eq("id", thread.listing_id)
        .maybeSingle(),
      supabase.from("profiles").select("username").eq("id", otherId).maybeSingle(),
    ]);

  const messages = (messageData ?? []) as unknown as {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
  }[];

  const listing = listingData as unknown as {
    title: string;
    slug: string;
    images: string[] | null;
    price_cents: number | null;
    is_wanted: boolean;
    status: string;
  } | null;

  const otherName =
    ((otherData as { username: string | null } | null)?.username) ?? "A hobbyist";

  const now = Date.now();
  const image = listing?.images?.[0];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <MarkThreadRead threadId={thread.id} role={isBuyer ? "buyer" : "seller"} />

      <div className="max-w-3xl mx-auto">
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          All messages
        </Link>

        {/* What this conversation is about */}
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
                {listing.status !== "active" && " · no longer listed"}
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 mb-8">
          {messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    mine
                      ? "bg-ocean-700/70 border border-ocean-600/50"
                      : "bg-ocean-900/70 border border-ocean-800/60"
                  }`}
                >
                  <p className="text-ocean-50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {m.body}
                  </p>
                  <p
                    className={`text-[11px] mt-1.5 ${
                      mine ? "text-ocean-300" : "text-ocean-600"
                    }`}
                  >
                    {mine ? "You" : otherName} · {timeAgo(m.created_at, now)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <MessageComposer
          threadId={thread.id}
          placeholder={`Reply to ${otherName}…`}
        />

        <div className="mt-4">
          <BlockButton userId={otherId} name={otherName} />
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
