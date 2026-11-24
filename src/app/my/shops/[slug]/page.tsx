import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import { loadShopDashboard } from "@/lib/stores/dashboard";
import { ShopOverview } from "@/components/stores/ShopDashboard";
import NumbersUnavailable from "@/components/stores/NumbersUnavailable";
import LinkBadge from "@/components/stores/LinkBadge";

export const metadata: Metadata = { title: "Shop overview" };
export const dynamic = "force-dynamic";

export default async function ShopOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, supabase } = await requireOwnedStore(slug);
  const dash = await loadShopDashboard(supabase, store.id);
  const badge = <LinkBadge path={`/stores/${store.slug}`} name={store.name} />;
  if (!dash)
    return (
      <>
        <NumbersUnavailable />
        {badge}
      </>
    );
  return (
    <>
      <ShopOverview data={dash} slug={store.slug} />
      {badge}
    </>
  );
}
