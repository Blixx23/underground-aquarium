import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import StoreDirectory from "./StoreDirectory";
import SuggestStore from "./SuggestStore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local Fish Stores",
  description:
    "Find local aquarium and fish stores across California. Search by name, city, or specialty, see what each shop carries, and get directions.",
};

type StoreRow = {
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  tags: string[] | null;
  claimed_by: string | null;
  lat: number | null;
  lng: number | null;
};

export default async function StoresPage() {
  const { data } = await supabasePublic
    .from("fish_stores")
    .select("slug, name, city, state, description, tags, claimed_by, lat, lng")
    .eq("status", "published")
    .order("city", { ascending: true })
    .order("name", { ascending: true });

  const stores = (data ?? []) as StoreRow[];

  // Latest updates across shops
  const { data: rawPosts } = await supabasePublic
    .from("store_posts")
    .select("id,title,body,created_at,store_id")
    .order("created_at", { ascending: false })
    .limit(12);
  const recentPosts = (rawPosts ?? []) as {
    id: string;
    title: string | null;
    body: string;
    created_at: string;
    store_id: string;
  }[];

  const postStoreIds = [...new Set(recentPosts.map((p) => p.store_id))];
  let storeById = new Map<string, { slug: string; name: string }>();
  if (postStoreIds.length > 0) {
    const { data: ss } = await supabasePublic
      .from("fish_stores")
      .select("id,slug,name")
      .eq("status", "published")
      .in("id", postStoreIds);
    storeById = new Map(
      ((ss as { id: string; slug: string; name: string }[]) ?? []).map((s) => [
        s.id,
        { slug: s.slug, name: s.name },
      ])
    );
  }

  const latest = recentPosts
    .filter((p) => storeById.has(p.store_id))
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      createdAt: p.created_at,
      storeSlug: storeById.get(p.store_id)!.slug,
      storeName: storeById.get(p.store_id)!.name,
    }));

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-2xl mb-8">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Local Fish Stores
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Find a fish store
          </h1>
          <p className="text-ocean-300">
            Real aquarium shops worth visiting across California. Search by name,
            city, or what they specialize in.
          </p>
        </div>

        {latest.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-xl text-emerald-400 flex items-center gap-2 mb-3">
              <Megaphone className="w-5 h-5" /> Latest shop updates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {latest.map((p) => (
                <Link
                  key={p.id}
                  href={`/stores/${p.storeSlug}`}
                  className="block rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                >
                  <p className="text-emerald-300 text-[11px] uppercase tracking-wide font-medium truncate">
                    {p.storeName}
                  </p>
                  {p.title && (
                    <p className="text-white text-sm font-medium mt-1">
                      {p.title}
                    </p>
                  )}
                  <p className="text-ocean-300 text-sm mt-1 line-clamp-2">
                    {p.body}
                  </p>
                  <p className="text-ocean-500 text-xs mt-2">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {stores.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <p className="text-white font-medium mb-1">No stores listed yet</p>
            <p className="text-ocean-400 text-sm">
              Check back soon as we map out shops in your area.
            </p>
          </div>
        ) : (
          <StoreDirectory stores={stores} />
        )}

        <div className="mt-12">
          <SuggestStore />
        </div>
      </div>
    </main>
  );
}