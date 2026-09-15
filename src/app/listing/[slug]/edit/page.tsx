import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllRegions } from "@/lib/marketplace/regions";
import PostListingForm, {
  type ExistingListing,
} from "@/components/marketplace/PostListingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit listing",
  robots: { index: false, follow: false },
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="font-display text-2xl text-white mb-4">
            Sign in to edit your listing
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

  const { data } = await supabase
    .from("listings")
    .select(
      "id, user_id, slug, title, category, description, price_cents, is_wanted, condition, city, images, region_id, state_code, allow_messages, show_email, contact_phone"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  const row = data as unknown as ExistingListing & { user_id: string };

  // Someone else's listing is simply not theirs to edit.
  if (row.user_id !== user.id) {
    return redirect(`/listing/${slug}`);
  }

  const regions = await getAllRegions();

  const existing: ExistingListing = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    description: row.description,
    price_cents: row.price_cents,
    is_wanted: row.is_wanted,
    condition: row.condition,
    city: row.city,
    images: row.images,
    region_id: row.region_id,
    state_code: row.state_code,
    allow_messages: row.allow_messages,
    show_email: row.show_email,
    contact_phone: row.contact_phone,
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/my/listings"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          My listings
        </Link>

        <h1 className="font-display text-4xl text-white mb-3">Edit listing</h1>
        <p className="text-ocean-400 mb-10">
          Changes go live straight away. Editing doesn&apos;t reset the expiry
          date — use Renew for that.
        </p>

        <PostListingForm regions={regions} existing={existing} />
      </div>
    </main>
  );
}
