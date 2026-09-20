import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import PromoKit from "@/components/stores/PromoKit";

export const metadata: Metadata = { title: "Promotions" };
export const dynamic = "force-dynamic";

export default async function ShopPromotionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store } = await requireOwnedStore(slug);
  return <PromoKit slug={store.slug} name={store.name} />;
}
