import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { matchSpeciesSlug } from "@/lib/species/match";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Waves, Heart, Fish } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import RelatedGuides from "@/components/discover/RelatedGuides";
import ListingsStrip from "@/components/discover/ListingsStrip";
import { listingsMatching, relatedThreads } from "@/lib/discover";
import SpeciesPhotos, { type SpeciesPhoto } from "@/components/species/SpeciesPhotos";
import SubmitSpeciesPhoto from "@/components/species/SubmitSpeciesPhoto";
import SpeciesVideos, { type SpeciesVideo } from "@/components/species/SpeciesVideos";
import SubmitSpeciesVideo from "@/components/species/SubmitSpeciesVideo";
import { speciesFaq } from "@/lib/species/faq";
import { ldJson } from "@/lib/jsonLd";
import { tankmatesFor } from "@/lib/tankBuilder/species";
import { buildPath } from "@/lib/tankBuilder/share";

export const revalidate = 3600;

const SITE = "https://www.undergroundaquarium.com";

type Params = { params: Promise<{ slug: string }> };

type SpeciesTank = {
  id: string;
  name: string | null;
  gallons: number | null;
  images: unknown;
  username: string | null;
  like_count: number;
};

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

  // Done here as well as in the page: metadata resolves before the page
  // starts streaming, so search engines get a real 308/404 status instead
  // of a 200 with a meta refresh.
  if (!s) {
    const alt = await matchSpeciesSlug(slug);
    if (alt) permanentRedirect(`/species/${alt}`);
    notFound();
  }

  const full = s.scientific_name
    ? `${s.common_name} (${s.scientific_name})`
    : s.common_name;

  const description =
    s.summary ??
    `Care guide and profile for ${full} with water parameters, tank size, temperament, diet, and more at UndergroundAquarium.`;

  const ogTitle = `${s.common_name} Care Guide & Profile`;
  const url = `/species/${slug}`;

  // Shared links show our designed card with the fish's name, key numbers
  // and a member's photo. The version changes with the cover photo, so
  // Facebook fetches the new card when a better photo is picked.
  const { data: photoRows } = await supabasePublic.rpc("public_species_photos", { p_slug: slug });
  const cover = ((photoRows ?? []) as SpeciesPhoto[])[0] ?? null;
  let h = 5381;
  const stamp = `${s.common_name}|${cover?.url ?? ""}`;
  for (let i = 0; i < stamp.length; i++) h = ((h << 5) + h + stamp.charCodeAt(i)) >>> 0;
  const cardUrl = `/api/species/${slug}/share-image?v=${h.toString(36)}`;
  const images = [{ url: cardUrl, width: 1200, height: 630, alt: `${s.common_name} care guide` }];

  return {
    // What people search: "cardinal tetra care", "cardinal tetra tank size".
    title: `${s.common_name} Care Guide: Tank Size, Temperature & Diet`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      type: "article",
      siteName: "Underground Aquarium",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [cardUrl],
    },
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

  if (!s) {
    // An old or renamed species link: send it to the species it meant.
    const alt = await matchSpeciesSlug(slug);
    if (alt) permanentRedirect(`/species/${alt}`);
    notFound();
  }

  const range = (
    a: number | null,
    b: number | null,
    unit: string
  ): string | null => (a != null && b != null ? `${a}-${b}${unit}` : null);

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

  // A reason to keep going: ads for this fish, and guides that mention it.
  const nameVariants = [s.common_name as string, (s.common_name as string).replace(/s$/i, "")];
  const [forSale, guides] = await Promise.all([
    listingsMatching(nameVariants, 4),
    relatedThreads({ terms: nameVariants, limit: 4 }),
  ]);

  const { data: speciesTanks } = await supabasePublic.rpc(
    "public_tanks_for_species",
    { p_slug: s.slug }
  );

  const { data: photoRows } = await supabasePublic.rpc("public_species_photos", { p_slug: s.slug });
  const photos = (photoRows ?? []) as SpeciesPhoto[];

  const { data: videoRows } = await supabasePublic.rpc("public_species_videos", { p_slug: s.slug });
  const videos = (videoRows ?? []) as SpeciesVideo[];

  // Members' breeding reports for this fish, if any: linked both ways.
  const { count: breedingReports } = await supabasePublic
    .from("public_breeding_guides")
    .select("species_slug", { count: "exact", head: true })
    .eq("species_slug", s.slug);
  const hasBreedingGuide = (breedingReports ?? 0) > 0;
  // Only real fish get a tank plan; group and genus pages don't have one set of numbers.
  const plannable = ["species", "variety", "form"].includes(String(s.entry_type ?? "species"));
  const mates = plannable ? await tankmatesFor(s.slug as string) : null;
  const planQty = Math.max(1, Number(s.min_group_size) || 1);
  const planHref = buildPath(s.min_tank_gal ?? null, [{ slug: s.slug as string, qty: planQty }]);
  const matesHref = mates
    ? buildPath(mates.gallons, [
        { slug: s.slug as string, qty: mates.qty },
        ...mates.picks.slice(0, 3).map((p) => ({ slug: p.slug, qty: p.qty })),
      ])
    : null;
  const faq = speciesFaq(s, {
    hasBreedingGuide,
    tankmates: mates ? { names: mates.picks.map((p) => p.common_name), gallons: mates.gallons } : null,
  });

  const fullName = s.scientific_name
    ? `${s.common_name} (${s.scientific_name})`
    : s.common_name;

  const schemaDescription =
    s.summary ??
    `Care guide and profile for ${fullName} with water parameters, tank size, temperament, diet, and more at UndergroundAquarium.`;

  // Structured data for search engines (breadcrumbs + care-guide article)
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Species",
          item: `${SITE}/species`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: s.common_name,
          item: `${SITE}/species/${s.slug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${s.common_name} Care Guide`,
      description: schemaDescription,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${SITE}/species/${s.slug}`,
      },
      author: {
        "@type": "Organization",
        name: "Underground Aquarium",
        url: SITE,
      },
      publisher: {
        "@type": "Organization",
        name: "Underground Aquarium",
        url: SITE,
        logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
      },
      ...(s.created_at ? { datePublished: s.created_at } : {}),
      about: {
        "@type": "Thing",
        name: s.common_name,
        ...(s.scientific_name ? { alternateName: s.scientific_name } : {}),
      },
      ...(photos.length > 0 ? { image: photos.map((p) => p.url) } : {}),
    },
    ...(faq.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />
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

        {photos.length > 0 && (
          <div className="mt-6">
            <SpeciesPhotos photos={photos} name={s.common_name as string} />
          </div>
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

        {plannable && (
          <Link
            href={planHref}
            className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3.5 text-ocean-100 hover:border-emerald-400/50"
          >
            <span className="flex items-center gap-3">
              <Fish className="h-5 w-5 shrink-0 text-emerald-300" />
              <span>
                <span className="block font-medium text-white">Plan a tank with {s.common_name}</span>
                <span className="block text-sm text-ocean-300">
                  Opens the Tank Builder with {planQty > 1 ? `${planQty} of them` : "one"} added
                  {s.min_tank_gal ? ` in a ${s.min_tank_gal} gallon tank` : ""}. Add tankmates and it checks the mix.
                </span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-emerald-300" />
          </Link>
        )}

        {mates && mates.picks.length > 0 && (
          <section className="mb-8 rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-5">
            <h2 className="font-display text-2xl text-white">Good tankmates for {s.common_name}</h2>
            <p className="mt-1 text-sm text-ocean-300">
              Checked by the Tank Builder in a {mates.gallons} gallon tank: no water, size or temperament problems with{" "}
              {mates.qty > 1 ? `a group of ${mates.qty}` : "one"} {s.common_name}.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {mates.picks.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/species/${p.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 hover:border-emerald-500/40 hover:bg-white/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{p.common_name}</span>
                      <span className="block truncate text-xs text-ocean-400">
                        {p.why}
                        {p.qty > 1 ? ` · groups of ${p.qty}+` : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ocean-400" />
                  </Link>
                </li>
              ))}
            </ul>
            {matesHref && (
              <Link
                href={matesHref}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
              >
                <Fish className="h-4 w-4" />
                Try a few together in the Tank Builder
              </Link>
            )}
          </section>
        )}

        <SpeciesVideos videos={videos} slug={s.slug as string} name={s.common_name as string} />

        {speciesTanks && speciesTanks.length > 0 && (
          <div className="border-t border-white/10 pt-8 mb-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
              Tanks with this fish ({speciesTanks.length})
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {speciesTanks.map((t: SpeciesTank) => {
                const imgs = Array.isArray(t.images) ? t.images : [];
                const cover = typeof imgs[0] === "string" ? imgs[0] : null;
                return (
                  <Link
                    key={t.id}
                    href={`/tanks/${t.id}`}
                    className="group block w-44 shrink-0 rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                  >
                    <div className="aspect-[4/3] bg-ocean-950/60 overflow-hidden">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={t.name ?? "Tank"}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ocean-700">
                          <Waves className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-white text-sm font-medium leading-snug truncate">
                        {t.name ?? "Untitled tank"}
                      </p>
                      <p className="text-ocean-400 text-xs mt-1 truncate">
                        {t.gallons ? `${t.gallons} gal` : "Tank"}
                        {t.username ? ` · @${t.username}` : ""}
                      </p>
                      {Number(t.like_count) > 0 && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-coral-300">
                          <Heart className="w-3 h-3 fill-current" /> {t.like_count}
                        </p>
                      )}
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

        {hasBreedingGuide && (
          <Link
            href={`/breeding/${s.slug}`}
            className="mb-10 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3.5 text-ocean-100 hover:border-emerald-400/50"
          >
            <span>
              <span className="block font-medium text-white">How to breed {s.common_name}</span>
              <span className="block text-sm text-ocean-300">
                {breedingReports} {breedingReports === 1 ? "report" : "reports"} from members who have spawned them
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-emerald-300" />
          </Link>
        )}

        {faq.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-2xl text-white mb-4">{s.common_name} care questions</h2>
            <dl className="space-y-3">
              {faq.map((f) => (
                <div key={f.q} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                  <dt className="font-medium text-white">{f.q}</dt>
                  <dd className="mt-1.5 text-ocean-200 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Members' photos and breeding videos: the ask comes after the care
            info, so the page reads as a guide first, not an empty gallery. */}
        <section className="mb-10 border-t border-white/10 pt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
            Keep {s.common_name}? Share yours
          </h2>
          <SubmitSpeciesPhoto
            speciesId={s.id as string}
            slug={s.slug as string}
            name={s.common_name as string}
            approvedCount={photos.length}
          />
          <SubmitSpeciesVideo
            speciesId={s.id as string}
            slug={s.slug as string}
            name={s.common_name as string}
            approvedCount={videos.length}
          />
        </section>

        <ListingsStrip
          listings={forSale}
          name={s.common_name as string}
          browseHref="/listings?category=livestock-freshwater"
        />

        <RelatedGuides guides={guides} title={`Guides about ${s.common_name}`} />

        <div className="h-8" />

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
