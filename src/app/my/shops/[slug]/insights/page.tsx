import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import { loadShopDashboard } from "@/lib/stores/dashboard";
import { ShopInsights } from "@/components/stores/ShopDashboard";
import NumbersUnavailable from "@/components/stores/NumbersUnavailable";

export const metadata: Metadata = { title: "Shop insights" };
export const dynamic = "force-dynamic";

export default async function ShopInsightsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, supabase } = await requireOwnedStore(slug);
  const dash = await loadShopDashboard(supabase, store.id);
  if (!dash) return <NumbersUnavailable />;
  return <ShopInsights data={dash} />;
}
