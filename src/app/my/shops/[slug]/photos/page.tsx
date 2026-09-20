import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import StorePhotos, { type StorePhoto } from "@/components/stores/StorePhotos";

export const metadata: Metadata = { title: "Shop photos" };
export const dynamic = "force-dynamic";

export default async function ShopPhotosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, supabase, user } = await requireOwnedStore(slug);
  const { data } = await supabase
    .from("store_photos")
    .select("id, url, caption")
    .eq("store_id", store.id)
    .order("sort")
    .order("created_at");

  return (
    <StorePhotos
      storeId={store.id}
      userId={user.id}
      initial={(data ?? []) as StorePhoto[]}
      isOwner
      heading={false}
    />
  );
}
