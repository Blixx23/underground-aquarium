import Link from "next/link";
import { Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  stock: number | null;
  images: string[] | null;
};

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, description, price, stock, images")
    .eq("is_active", true)
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

        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const image = product.images?.[0];
              return (
                <Link
                  key={product.id}
                  href={`/marketplace/${product.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-ocean-900/60 border border-ocean-800/60 hover:border-ocean-600/70 transition-colors duration-300"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-ocean-800 to-ocean-950 flex items-center justify-center overflow-hidden">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Fish className="w-12 h-12 text-ocean-700" />
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h2 className="font-display text-lg text-white leading-snug">
                        {product.name}
                      </h2>
                      <span className="shrink-0 font-display text-lg text-ocean-300">
                        ${Number(product.price).toFixed(2)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-sm text-ocean-400 line-clamp-2 mb-4">
                        {product.description}
                      </p>
                    )}
                    {typeof product.stock === "number" && (
                      <p className="text-xs text-ocean-500">{product.stock} in stock</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}