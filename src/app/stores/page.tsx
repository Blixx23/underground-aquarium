import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import StoreDirectory from "./StoreDirectory";
import SuggestStore from "./SuggestStore";
import OsmCredit from "@/components/stores/OsmCredit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local Fish Stores",
  description:
    "Find local aquarium and fish stores near you. Search by name, city, or specialty, see what each shop carries, and get directions.",
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

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ near?: string }>;
}) {
  const { near } = await searchParams;
  const { data } = await supabasePublic
    .from("fish_stores")
    .select("slug, name, city, state, description, tags, claimed_by, lat, lng")
    .eq("status", "published")
    .order("state", { ascending: true })
    .order("city", { ascending: true })
    .order("name", { ascending: true });

  const stores = (data ?? []) as StoreRow[];

  // Latest updates across shops, shown under the directory.
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

  const stateCount = new Set(stores.map((s) => s.state).filter(Boolean)).size;

  return (
    <main className="min-h-screen px-6 pb-20 pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 max-w-2xl">
          <h1 className="font-display text-3xl text-white sm:text-4xl">
            Find a fish store
          </h1>
          <p className="mt-2 text-ocean-300">
            {stores.length > 0
              ? `${stores.length} independent aquarium shops across ${stateCount} states. No chains.`
              : "Real aquarium shops worth visiting, wherever you are."}
          </p>
        </div>

        {stores.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="mb-1 font-medium text-white">No stores listed yet</p>
            <p className="text-sm text-ocean-400">
              Check back soon as we map out shops in your area.
            </p>
          </div>
        ) : (
          <StoreDirectory stores={stores} autoLocate={near === "1"} />
        )}

        {latest.length > 0 && (
          <div className="mt-16 border-t border-white/10 pt-10">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl text-emerald-400">
              <Megaphone className="h-5 w-5" /> Latest shop updates
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {latest.map((p) => (
                <Link
                  key={p.id}
                  href={`/stores/${p.storeSlug}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-emerald-500/40 hover:bg-white/10"
                >
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-emerald-300">
                    {p.storeName}
                  </p>
                  {p.title && (
                    <p className="mt-1 text-sm font-medium text-white">{p.title}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-ocean-300">{p.body}</p>
                  <p className="mt-2 text-xs text-ocean-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12">
          <SuggestStore />
        </div>

        <OsmCredit className="mt-10" />
      </div>
    </main>
  );
}
