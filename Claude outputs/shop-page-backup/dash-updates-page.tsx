import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import StorePosts from "@/app/stores/StorePosts";

export const metadata: Metadata = { title: "Shop updates" };
export const dynamic = "force-dynamic";

export default async function ShopUpdatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, supabase, user } = await requireOwnedStore(slug);

  const withPhotos = await supabase
    .from("store_posts")
    .select("id, title, body, images, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const rows = (withPhotos.error
    ? (
        await supabase
          .from("store_posts")
          .select("id, title, body, created_at")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false })
      ).data ?? []
    : withPhotos.data ?? []) as {
    id: string;
    title: string | null;
    body: string;
    images?: string[] | null;
    created_at: string;
  }[];

  return (
    <div>
      <p className="mb-4 text-sm text-ocean-400">
        Restocks, sales and events. Everyone following your shop gets a notification, and it shows on
        the main store page too.
      </p>
      <StorePosts
        storeId={store.id}
        initialPosts={rows.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          images: p.images ?? null,
          createdAt: p.created_at,
        }))}
        isOwner
        currentUserId={user.id}
      />
    </div>
  );
}
