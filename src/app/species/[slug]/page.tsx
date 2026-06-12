import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

function firstImage(images: unknown): string | null {
  let arr: unknown = images;
  if (typeof images === "string") {
    try {
      arr = JSON.parse(images);
    } catch {
      return null;
    }
  }
  if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "string") {
    return arr[0];
  }
  return null;
}

export async function generateStaticParams() {
  const { data } = await supabasePublic.from("species").select("slug");
  return (data ?? []).map((s) => ({ slug: s.slug as string }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { data: s } = await supabasePublic
    .from("species")
    .select("common_name, scientific_name, summary")
    .eq("slug", slug)
    .maybeSingle();

  if (!s) return { title: "Species not found" };

  const full = s.scientific_name
    ? `${s.common_name} (${s.scientific_name})`
    : s.common_name;

  return {
    title: s.common_name,
    description:
      s.summary ?? `Care guide and profile for ${full} at UndergroundAquarium.`,
    alternates: { canonical: `/species/${slug}` },
  };
}

function Stat({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
      <dt className="text-[11px] uppercase tracking-wide text-ocean-400 mb-0.5">
        {label}
      </dt>
      <dd className="text-white text-sm">{value}</dd>
    </div>
  );
}

export default async function SpeciesDetailPage({ params }: Params) {
  const { slug } = await params;

  const { data: s } = await supabasePublic
    .from("species")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!s) notFound();

  const range = (
    a: number | null,
    b: number | null,
    unit: string
  ): string | null => (a != null && b != null ? `${a}–${b}${unit}` : null);

  // Live marketplace listings tagged to this species
  const { data: listings } = await supabasePublic
    .from("products")
    .select("name, slug, price, images, stock")
    .eq("species_slug", s.slug)
    .eq("is_active", true)
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .limit(12);

  let parent: { slug: string; common_name: string } | null = null;
  if (s.parent_slug) {
    const { data } = await supabasePublic
      .from("species")
      .select("slug, common_name")
      .eq("slug", s.parent_slug)
      .maybeSingle();
    parent = data ?? null;
  }

  const { data: children } = await supabasePublic
    .from("species")
    .select("slug, common_name")
    .eq("parent_slug", s.slug)
    .order("common_name");

  const { data: related } = await supabasePublic
    .from("species")
    .select("slug, common_name")
    .eq("group_name", s.group_name)
    .neq("slug", s.slug)
    .is("parent_slug", null)
    .order("common_name")
    .limit(10);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <nav className="flex items-center gap-1.5 text-sm text-ocean-400 mb-8">
          <Link href="/species" className="hover:text-white transition-colors">
            Species
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-ocean-200">{s.common_name}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {s.group_name && (
            <span className="inline-block text-xs uppercase tracking-wide text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
              {s.group_name}
            </span>
          )}
          {(s.trade_codes ?? []).map((c: string) => (
            <span
              key={c}
              className="text-xs font-mono uppercase tracking-wide text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5"
            >
              {c}
            </span>
          ))}
          {!s.described && (
            <span className="text-xs uppercase tracking-wide text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-0.5">
              Undescribed
            </span>
          )}
        </div>

        <h1 className="font-display text-4xl sm:text-5xl text-white mb-2">
          {s.common_name}
        </h1>
        {s.scientific_name && (
          <p className="italic text-ocean-300 text-lg mb-1">
            {s.scientific_name}
          </p>
        )}
        {s.also_known_as && s.also_known_as.length > 0 && (
          <p className="text-ocean-400 text-sm mb-1">
            Also known as: {s.also_known_as.join(", ")}
          </p>
        )}
        {s.former_names && s.former_names.length > 0 && (
          <p className="text-ocean-400 text-sm mb-1">
            Formerly: {s.former_names.join(", ")}
          </p>
        )}

        {parent && (
          <p className="text-ocean-300 text-sm mt-3">
            A variety of{" "}
            <Link
              href={`/species/${parent.slug}`}
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              {parent.common_name}
            </Link>
          </p>
        )}

        {s.summary && (
          <p className="text-ocean-200 text-lg leading-relaxed mt-6 mb-6">
            {s.summary}
          </p>
        )}

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
          <Stat label="Water" value={s.water_type} />
          <Stat label="Temperature" value={range(s.temp_min_f, s.temp_max_f, "°F")} />
          <Stat label="pH" value={range(s.ph_min, s.ph_max, "")} />
          <Stat label="Hardness" value={range(s.gh_min, s.gh_max, " dGH")} />
          <Stat label="Max size" value={s.max_size_in != null ? `${s.max_size_in} in` : null} />
          <Stat label="Min tank" value={s.min_tank_gal != null ? `${s.min_tank_gal} gal` : null} />
          <Stat label="Temperament" value={s.temperament} />
          <Stat
            label="Social"
            value={s.min_group_size ? `${s.social} (${s.min_group_size}+)` : s.social}
          />
          <Stat label="Swim level" value={s.swim_level} />
          <Stat label="Diet" value={s.diet} />
          <Stat label="Care level" value={s.care_level} />
          <Stat label="Lifespan" value={s.lifespan} />
          <Stat label="Breeding" value={s.breeding_type} />
          <Stat label="Suitability" value={s.suitability} />
          <Stat label="Origin" value={s.origin} />
        </dl>

        {listings && listings.length > 0 && (
          <div className="border-t border-white/10 pt-8 mb-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
              Available now ({listings.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {listings.map((p) => {
                const img = firstImage(p.images);
                return (
                  <Link
                    key={p.slug}
                    href={`/marketplace/${p.slug}`}
                    className="block rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <div className="w-full h-28 bg-white/5" />
                    )}
                    <div className="p-3">
                      <p className="text-white text-sm font-medium leading-snug">
                        {p.name}
                      </p>
                      <p className="text-emerald-300 text-sm mt-1">
                        ${Number(p.price).toFixed(2)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {s.body && (
          <p className="text-ocean-300 leading-relaxed mb-10">{s.body}</p>
        )}

        {children && children.length > 0 && (
          <div className="border-t border-white/10 pt-8 mb-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
              Varieties &amp; forms
            </h2>
            <div className="flex flex-wrap gap-2">
              {children.map((c) => (
                <Link
                  key={c.slug}
                  href={`/species/${c.slug}`}
                  className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-ocean-200 hover:text-white hover:border-emerald-500/40 transition-colors"
                >
                  {c.common_name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {related && related.length > 0 && (
          <div className="border-t border-white/10 pt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
              More in {s.group_name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/species/${r.slug}`}
                  className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-ocean-200 hover:text-white hover:border-emerald-500/40 transition-colors"
                >
                  {r.common_name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <Link
            href="/species"
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all species
          </Link>
        </div>
      </div>
    </main>
  );
}