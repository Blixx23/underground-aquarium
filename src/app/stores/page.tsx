import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import SuggestStore from "./SuggestStore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local Fish Stores",
  description:
    "Find local aquarium and fish stores near you — browse shops by area, see what they specialize in, and get directions.",
};

type StoreRow = {
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  tags: string[] | null;
};

export default async function StoresPage() {
  const { data } = await supabasePublic
    .from("fish_stores")
    .select("slug, name, city, state, description, tags")
    .eq("status", "published")
    .order("state", { ascending: true })
    .order("city", { ascending: true })
    .order("name", { ascending: true });

  const stores = (data ?? []) as StoreRow[];

  const byState = new Map<string, StoreRow[]>();
  for (const s of stores) {
    const key = s.state || "Other";
    if (!byState.has(key)) byState.set(key, []);
    byState.get(key)!.push(s);
  }
  const states = [...byState.keys()];

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-8">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Local Fish Stores
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Find a fish store
          </h1>
          <p className="text-ocean-300">
            Real aquarium shops worth visiting, organized by area. Know a great
            store that isn&apos;t listed? Suggest it and we&apos;ll add it.
          </p>
        </div>

        {stores.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <Store className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No stores listed yet</p>
            <p className="text-ocean-400 text-sm">
              Check back soon as we map out shops in your area.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {states.map((state) => (
              <section key={state}>
                <h2 className="font-display text-2xl text-emerald-400 mb-4">
                  {state}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {byState.get(state)!.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/stores/${s.slug}`}
                      className="block rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                    >
                      <h3 className="text-white font-medium">{s.name}</h3>
                      {(s.city || s.state) && (
                        <p className="text-ocean-400 text-sm mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {[s.city, s.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {s.tags && s.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="text-[11px] uppercase tracking-wide text-ocean-300 bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Suggest a store */}
        <div className="mt-12">
          <SuggestStore />
        </div>
      </div>
    </main>
  );
}