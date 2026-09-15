import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import { formatPrice } from "@/lib/marketplace/listings";
import MessageComposer from "@/components/messages/MessageComposer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Message the poster",
  robots: { index: false, follow: false },
};

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const { listing: listingSlug } = await searchParams;
  if (!listingSlug) return redirect("/marketplace");

  const { data } = await supabasePublic
    .from("listings")
    .select("id, user_id, title, slug, images, price_cents, is_wanted, status, allow_messages")
    .eq("slug", listingSlug)
    .maybeSingle();

  const listing = data as unknown as {
    id: string;
    user_id: string;
    title: string;
    slug: string;
    images: string[] | null;
    price_cents: number | null;
    is_wanted: boolean;
    status: string;
    allow_messages: boolean;
  } | null;

  if (!listing || listing.status !== "active" || !listing.allow_messages) {
    return redirect("/marketplace");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="font-display text-2xl text-white mb-2">
            Sign in to message
          </h1>
          <p className="text-ocean-400 mb-6">
            An account keeps both sides accountable and lets them reply to you.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl border border-ocean-700/60 text-ocean-200 hover:text-white hover:border-ocean-600 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Your own listing — nothing to message about.
  if (user.id === listing.user_id) {
    return redirect(`/listing/${listing.slug}`);
  }

  // Already talking about this one? Go straight to that conversation.
  const { data: existing } = await supabase
    .from("listing_threads")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("buyer_id", user.id)
    .maybeSingle();
  if (existing) {
    return redirect(`/messages/${(existing as { id: string }).id}`);
  }

  const { data: sellerData } = await supabasePublic
    .from("profiles")
    .select("username")
    .eq("id", listing.user_id)
    .maybeSingle();
  const sellerName =
    ((sellerData as { username: string | null } | null)?.username) ?? "the poster";

  const image = listing.images?.[0];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/listing/${listing.slug}`}
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to the listing
        </Link>

        <h1 className="font-display text-3xl text-white mb-6">
          Message {sellerName}
        </h1>

        <div className="flex items-center gap-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-4 mb-6">
          <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-ocean-950 border border-ocean-800/60 flex items-center justify-center">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Fish className="w-6 h-6 text-ocean-700" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-white">{listing.title}</p>
            {!listing.is_wanted && (
              <p className="text-sm text-ocean-500">
                {formatPrice(listing.price_cents)}
              </p>
            )}
          </div>
        </div>

        <MessageComposer
          listingSlug={listing.slug}
          autoFocus
          submitLabel="Send message"
          placeholder={`Hi — is this still available?`}
        />

        <p className="text-xs text-ocean-600 mt-6 leading-relaxed">
          Your email stays private. {sellerName} will see your username and get
          a notification with your message.
        </p>
      </div>
    </main>
  );
}
