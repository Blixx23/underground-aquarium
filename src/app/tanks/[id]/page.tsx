import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type Tank = {
  id: string;
  user_id: string;
  name: string;
  gallons: number | null;
  items: { slug: string; qty: number }[] | null;
  images: string[] | null;
  is_public: boolean;
  updated_at: string;
};

type SpeciesRow = {
  slug: string;
  common_name: string;
  scientific_name: string | null;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const { data: tank } = await supabasePublic
    .from("tanks")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return {
    title: tank?.name ? `${tank.name} — Community Tank` : "Community Tank",
    robots: { index: false, follow: false },
  };
}

export default async function TankPage({ params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS: anyone can read a public tank; the owner can also read their own.
  const { data: tank, error } = await supabase
    .from("tanks")
    .select("id,user_id,name,gallons,items,images,is_public,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !tank) notFound();
  const t = tank as Tank;

  const items = Array.isArray(t.items) ? t.items : [];
  const images = Array.isArray(t.images) ? t.images : [];
  const isOwner = !!user && user.id === t.user_id;

  // Look up species details for the contents list
  const slugs = items.map((it) => it.slug);
  let bySlug = new Map<string, SpeciesRow>();
  if (slugs.length > 0) {
    const { data: speciesRows } = await supabasePublic
      .from("species")
      .select("slug,common_name,scientific_name")
      .in("slug", slugs);
    bySlug = new Map(
      ((speciesRows as SpeciesRow[]) ?? []).map((s) => [s.slug, s])
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Top row */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider">
            Community Tank
          </p>
          {isOwner && (
            <Link
              href={`/tank-builder?tank=${t.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 text-ocean-200 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
            >
              <Pencil className="w-4 h-4" /> Edit in Tank Builder
            </Link>
          )}
        </div>

        <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
          {t.name}
        </h1>
        <p className="text-ocean-300 mb-8">
          {t.gallons ? `${t.gallons} gallon tank` : "Tank"} ·{" "}
          {items.length} {items.length === 1 ? "species" : "species"}
        </p>

        {/* Photos */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${t.name} photo ${i + 1}`}
                className="w-full rounded-xl border border-white/10 object-cover"
              />
            ))}
          </div>
        )}

        {/* Contents */}
        <h2 className="font-display text-2xl text-emerald-400 mb-4">
          What&apos;s in it
        </h2>
        {items.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
            <p className="text-ocean-400 text-sm">No fish added to this tank.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const sp = bySlug.get(it.slug);
              const inner = (
                <>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {sp?.common_name ?? it.slug}
                    </p>
                    {sp?.scientific_name && (
                      <p className="italic text-ocean-400 text-xs">
                        {sp.scientific_name}
                      </p>
                    )}
                  </div>
                  <span className="text-ocean-300 text-sm shrink-0">
                    ×{it.qty}
                  </span>
                </>
              );
              return sp ? (
                <Link
                  key={it.slug}
                  href={`/species/${it.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={it.slug}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <Link
            href="/tank-builder"
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-white transition-colors"
          >
            <Fish className="w-4 h-4" /> Plan your own tank
          </Link>
        </div>
      </div>
    </main>
  );
}