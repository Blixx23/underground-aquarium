import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Store, User } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import MarketplaceBrowser from "@/components/marketplace/MarketplaceBrowser";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
};

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

async function getStore(slug: string): Promise<StoreRow | null> {
  const { data } = await supabasePublic
    .from("stores")
    .select("id, name, slug, owner_id")
    .eq("slug", slug)
    .maybeSingle();
  return (data as StoreRow | null) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Shop not found" };
  return {
    title: `${store.name} — Shop`,
    description: `Browse listings from ${store.name} on Underground Aquarium.`,
  };
}

export default async function ShopPage({ params }: Params) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const { data: ownerProfile } = await supabasePublic
    .from("profiles")
    .select("username, full_name")
    .eq("id", store.owner_id)
    .maybeSingle();
  const owner =
    (ownerProfile as { username: string | null; full_name: string | null } | null) ??
    null;

  const { data: prod } = await supabasePublic
    .from("products")
    .select(
      "id, name, slug, description, price, stock, images, category, created_at, shipping_price"
    )
    .eq("store_id", store.id)
    .eq("is_active", true)
    .not("is_draft", "is", true)
    .not("is_live_animal", "is", true)
    .order("created_at", { ascending: false });
  const products = (prod ?? []) as unknown as Product[];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/marketplace"
          className="mb-8 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-ocean-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the marketplace
        </Link>

        <div className="mb-10 flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-ocean-800/60">
            <Store className="h-7 w-7 text-ocean-300" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ocean-500">
              Shop
            </p>
            <h1 className="font-display text-3xl text-white sm:text-4xl">
              {store.name}
            </h1>
            {owner?.username && (
              <Link
                href={`/u/${owner.username}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-ocean-400 transition-colors hover:text-emerald-300"
              >
                <User className="h-3.5 w-3.5" />
                {owner.full_name || `@${owner.username}`}
              </Link>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="py-24 text-center">
            <Store className="mx-auto mb-4 h-10 w-10 text-ocean-600" />
            <p className="mb-1 text-lg text-ocean-300">No listings yet</p>
            <p className="text-sm text-ocean-500">
              This shop hasn&apos;t posted anything for sale.
            </p>
          </div>
        ) : (
          <MarketplaceBrowser products={products} />
        )}
      </div>
    </main>
  );
}
