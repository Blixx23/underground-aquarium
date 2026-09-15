import type { Metadata } from "next";
import { getAllRegions } from "@/lib/marketplace/regions";
import PostListingForm from "@/components/marketplace/PostListingForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Post a Free Aquarium Ad",
  description:
    "List fish, coral, plants, tanks or gear for free. No listing fees, no commission, no selling limits. Takes about a minute.",
};

export default async function PostPage() {
  const regions = await getAllRegions();

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          New Listing
        </p>
        <h1 className="font-display text-4xl text-white mb-3">
          Post it free
        </h1>
        <p className="text-ocean-400 mb-10">
          No listing fee, no commission, no cut of the sale. You deal with the
          other hobbyist directly.
        </p>

        <PostListingForm regions={regions} />
      </div>
    </main>
  );
}
