import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ShopTimeline, { type TimelineItem } from "@/components/stores/ShopTimeline";

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

  // The logo shows on each post. Before step 61 it just reads as empty.
  const { data: brand } = await supabaseAdmin.from("fish_stores").select("logo_url").eq("id", store.id).maybeSingle();
  const logoUrl = (brand as { logo_url?: string | null } | null)?.logo_url ?? null;

  const items: TimelineItem[] = rows.map((p) => ({
    kind: "post",
    id: p.id,
    title: p.title,
    body: p.body,
    images: p.images && p.images.length ? p.images : null,
    createdAt: p.created_at,
  }));

  return (
    <div>
      <p className="mb-4 text-sm text-ocean-400">
        Restocks, sales, new arrivals and events, with photos. Posts show on your shop page, and everyone following
        your shop gets a notification.
      </p>
      <ShopTimeline
        storeId={store.id}
        storeName={store.name}
        logoUrl={logoUrl}
        initial={items}
        isOwner
        currentUserId={user.id}
      />
    </div>
  );
}
