import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SellerTabs from "../SellerTabs";
import ListingsManager from "./ListingsManager";

type Listing = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  images: string[] | null;
  is_active: boolean | null;
  is_draft: boolean | null;
  stock: number | null;
  category: string | null;
  created_at: string;
};

export default async function SellerListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select(
      "id, payouts_enabled, ship_street1, ship_city, ship_state, ship_zip"
    )
    .eq("owner_id", user.id);
  const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);

  const firstStore = (stores ?? [])[0] as
    | {
        payouts_enabled: boolean | null;
        ship_street1: string | null;
        ship_city: string | null;
        ship_state: string | null;
        ship_zip: string | null;
      }
    | undefined;
  const canPublish = !!(
    firstStore?.payouts_enabled &&
    firstStore.ship_street1 &&
    firstStore.ship_city &&
    firstStore.ship_state &&
    firstStore.ship_zip
  );

  let listings: Listing[] = [];
  if (storeIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, name, slug, price, images, is_active, is_draft, stock, category, created_at"
      )
      .in("store_id", storeIds)
      .order("created_at", { ascending: false });
    listings = (products ?? []) as unknown as Listing[];
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          Seller Hub
        </p>
        <h1 className="font-display text-4xl text-white mb-8">Your listings</h1>
        <SellerTabs />
        <ListingsManager listings={listings} canPublish={canPublish} />
      </div>
    </main>
  );
}
