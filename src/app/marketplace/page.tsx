import { Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MarketplaceBrowser from "@/components/marketplace/MarketplaceBrowser";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  stock: number | null;
  images: string[] | null;
  category: string | null;
  created_at: string;
  shipping_price: number | string | null;
};

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, price, stock, images, category, created_at, shipping_price"
    )
    .eq("is_active", true)
    .is("archived_at", null)
    .not("is_live_animal", "is", true)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as unknown as Product[];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
            Marketplace
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white mb-3">
            Browse the Reef
          </h1>
          <p className="text-ocean-400 max-w-2xl">
            Rare plants, equipment, and aquascaping gear from keepers everywhere.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300">
            Something went wrong loading products. Please refresh and try again.
          </div>
        )}

        {!error && products.length === 0 && (
          <div className="text-center py-24">
            <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
            <p className="text-ocean-300 text-lg mb-1">No listings yet</p>
            <p className="text-ocean-500 text-sm">
              Be the first to list something for sale.
            </p>
          </div>
        )}

        {!error && products.length > 0 && (
          <MarketplaceBrowser products={products} />
        )}
      </div>
    </main>
  );
}
