import Link from "next/link";
import { Fish, ArrowLeft, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BuyButton from "./buy-button";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  stock: number | null;
  images: string[] | null;
  is_live_animal: boolean | null;
  species_slug: string | null;
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, price, stock, images, is_live_animal, species_slug"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  const product = data as unknown as Product | null;

  if (!product) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center py-24">
          <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white mb-2">Listing not found</h1>
          <p className="text-ocean-400 mb-6">
            This product may have been removed or is no longer available.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-ocean-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to the marketplace
          </Link>
        </div>
      </main>
    );
  }

  const image = product.images?.[0];

  let species: { common_name: string } | null = null;
  if (product.species_slug) {
    const { data: sp } = await supabase
      .from("species")
      .select("common_name")
      .eq("slug", product.species_slug)
      .maybeSingle();
    species = (sp as { common_name: string } | null) ?? null;
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-ocean-200 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to the marketplace
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-ocean-800 to-ocean-950 border border-ocean-800/60 flex items-center justify-center">
            {image ? (
              <img src={image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Fish className="w-20 h-20 text-ocean-700" />
            )}
            {product.is_live_animal && (
              <span className="absolute top-4 left-4 px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded-full bg-brine-500/90 text-white">
                Live animal
              </span>
            )}
          </div>

          <div>
            <h1 className="font-display text-3xl md:text-4xl text-white leading-tight mb-3">
              {product.name}
            </h1>
            <p className="font-display text-3xl text-ocean-300 mb-6">
              ${Number(product.price).toFixed(2)}
            </p>

            {typeof product.stock === "number" && (
              <p className="text-sm text-ocean-400 mb-6">
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </p>
            )}

            {product.description && (
              <div className="mb-8">
                <h2 className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-2">
                  Description
                </h2>
                <p className="text-ocean-300 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {species && product.species_slug && (
              <Link
                href={`/species/${product.species_slug}`}
                className="inline-flex items-center gap-2 mb-8 px-4 py-2.5 rounded-xl bg-ocean-900/60 border border-ocean-800/60 text-ocean-200 hover:border-ocean-500 hover:text-white transition-colors"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Care guide: {species.common_name}
              </Link>
            )}

            <BuyButton productId={product.id} stock={product.stock} />
          </div>
        </div>
      </div>
    </main>
  );
}