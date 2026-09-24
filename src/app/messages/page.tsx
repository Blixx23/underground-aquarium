import type { Metadata } from "next";
import Link from "next/link";
import { Fish, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/marketplace/listings";
import Avatar from "@/components/profile/Avatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

type ThreadRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
};

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <MessageCircle className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white mb-2">
            Sign in to see your messages
          </h1>
          <Link
            href="/login"
            className="mt-4 inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  // Row level security already limits this to threads the viewer is part of.
  const { data: threadData } = await supabase
    .from("listing_threads")
    .select(
      "id, listing_id, buyer_id, seller_id, last_message_at, buyer_last_read_at, seller_last_read_at"
    )
    .order("last_message_at", { ascending: false })
    .limit(100);

  const threads = (threadData ?? []) as unknown as ThreadRow[];

  if (threads.length === 0) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl text-white mb-10">Messages</h1>
          <div className="text-center py-20 rounded-2xl border border-dashed border-ocean-800/60">
            <MessageCircle className="w-10 h-10 text-ocean-700 mx-auto mb-4" />
            <p className="text-ocean-200 text-lg mb-1">No conversations yet</p>
            <p className="text-ocean-500 text-sm max-w-sm mx-auto">
              When someone messages you, or you message them from a listing or
              a profile, it shows up here.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-block px-6 py-3 rounded-xl border border-ocean-700/60 text-ocean-200 hover:text-white hover:border-ocean-600 transition-colors"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const listingIds = [
    ...new Set(threads.map((t) => t.listing_id).filter((x): x is string => Boolean(x))),
  ];
  const otherIds = [
    ...new Set(
      threads.map((t) => (t.buyer_id === user.id ? t.seller_id : t.buyer_id))
    ),
  ];
  const threadIds = threads.map((t) => t.id);

  const [{ data: listingData }, { data: profileData }, { data: messageData }] =
    await Promise.all([
      listingIds.length
        ? supabase.from("listings").select("id, title, slug, images").in("id", listingIds)
        : Promise.resolve({ data: [] }),
      supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", otherIds),
      supabase
        .from("listing_messages")
        .select("thread_id, body, sender_id, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false })
        .limit(400),
    ]);

  const listings = new Map(
    ((listingData ?? []) as unknown as {
      id: string;
      title: string;
      slug: string;
      images: string[] | null;
    }[]).map((l) => [l.id, l])
  );

  const people = new Map(
    (
      (profileData ?? []) as unknown as {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
      }[]
    ).map((p) => [p.id, p])
  );

  // The query came back newest first, so the first row we see for a thread
  // is that thread's latest message.
  const latest = new Map<string, { body: string; sender_id: string }>();
  for (const m of (messageData ?? []) as unknown as {
    thread_id: string;
    body: string;
    sender_id: string;
  }[]) {
    if (!latest.has(m.thread_id)) {
      latest.set(m.thread_id, { body: m.body, sender_id: m.sender_id });
    }
  }

  const now = Date.now();

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl text-white mb-8">Messages</h1>

        <div className="space-y-2">
          {threads.map((t) => {
            const isBuyer = t.buyer_id === user.id;
            const otherId = isBuyer ? t.seller_id : t.buyer_id;
            const lastRead = isBuyer
              ? t.buyer_last_read_at
              : t.seller_last_read_at;
            const unread =
              !lastRead ||
              new Date(t.last_message_at).getTime() >
                new Date(lastRead).getTime();

            const direct = !t.listing_id;
            const listing = t.listing_id ? listings.get(t.listing_id) : undefined;
            const preview = latest.get(t.id);
            const image = listing?.images?.[0];
            const other = people.get(otherId);
            const otherName = other?.full_name?.trim() || other?.username || "A hobbyist";

            return (
              <Link
                key={t.id}
                href={`/messages/${t.id}`}
                className={`flex items-start gap-4 rounded-2xl border px-4 py-4 transition-colors ${
                  unread
                    ? "bg-ocean-900/70 border-ocean-700/70 hover:border-ocean-500"
                    : "bg-ocean-900/40 border-ocean-800/60 hover:border-ocean-600/70"
                }`}
              >
                {direct ? (
                  <Avatar name={otherName} src={other?.avatar_url ?? null} size={56} />
                ) : (
                <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-ocean-950 border border-ocean-800/60 flex items-center justify-center">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Fish className="w-6 h-6 text-ocean-700" />
                  )}
                </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className={`truncate ${
                        unread ? "text-white font-medium" : "text-ocean-200"
                      }`}
                    >
                      {otherName}
                    </p>
                    <span className="shrink-0 text-xs text-ocean-500">
                      {timeAgo(t.last_message_at, now)}
                    </span>
                  </div>
                  <p className="text-sm text-ocean-500 truncate mb-1">
                    {direct ? "Direct message" : listing?.title ?? "Listing removed"}
                  </p>
                  {preview && (
                    <p
                      className={`text-sm truncate ${
                        unread ? "text-ocean-200" : "text-ocean-600"
                      }`}
                    >
                      {preview.sender_id === user.id ? "You: " : ""}
                      {preview.body}
                    </p>
                  )}
                </div>

                {unread && (
                  <span className="shrink-0 mt-2 w-2.5 h-2.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
