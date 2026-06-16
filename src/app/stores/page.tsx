import type { Metadata } from "next";
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
};

export default async function StoresPage() {
  const { data } = await supabasePublic
    .from("fish_stores")
    .select("slug, name, city, state, description, tags, claimed_by")
    .eq("status", "published")
    .order("city", { ascending: true })
    .order("name", { ascending: true });

  const stores = (data ?? []) as StoreRow[];

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