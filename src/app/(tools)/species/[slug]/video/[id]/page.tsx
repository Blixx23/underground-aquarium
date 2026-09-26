import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Clapperboard, Play } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { clock, isoDuration, STAGE_LABEL, videoHeading, type VideoStage } from "@/lib/video/stages";
import type { SpeciesVideo } from "@/components/species/SpeciesVideos";

export const revalidate = 3600;

const SITE = "https://www.undergroundaquarium.com";

type Params = { params: Promise<{ slug: string; id: string }> };

type WatchVideo = SpeciesVideo & {
  species_slug: string;
  common_name: string;
  scientific_name: string | null;
  summary: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string): Promise<WatchVideo | null> {
  if (!UUID.test(id)) return null;
  const { data } = await supabasePublic.rpc("public_species_video", { p_id: id });
  const row = (data as WatchVideo[] | null)?.[0];
  return row ?? null;
}

function describe(v: WatchVideo) {
  const who = v.full_name || v.username || "a member";
  const what = STAGE_LABEL[v.stage as VideoStage]?.toLowerCase() ?? "breeding";
  const base = `${v.common_name}${v.scientific_name ? ` (${v.scientific_name})` : ""} ${what} filmed in a home aquarium by ${who}.`;
  return v.caption ? `${base} ${v.caption}` : base;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  const v = await load(id);
  // Decided here too, so search engines get a real 404/308 rather than
  // a 200 with a meta refresh.
  if (!v) notFound();
  if (v.species_slug !== slug) permanentRedirect(`/species/${v.species_slug}/video/${id}`);

  const heading = videoHeading(v.common_name, v.stage);
  const title = `${heading.charAt(0).toUpperCase()}${heading.slice(1)} Video`;
  const description = describe(v);
  const url = `/species/${v.species_slug}/video/${v.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "video.other",
      siteName: "UndergroundAquarium",
      images: v.poster_url ? [{ url: v.poster_url, width: v.width ?? undefined, height: v.height ?? undefined }] : undefined,
      videos: [{ url: v.video_url, width: v.width ?? undefined, height: v.height ?? undefined, type: "video/mp4" }],
    },
    twitter: {
      card: v.poster_url ? "summary_large_image" : "summary",
      title,
      description,
      images: v.poster_url ? [v.poster_url] : undefined,
    },
  };
}

export default async function SpeciesVideoPage({ params }: Params) {
  const { slug, id } = await params;
  const v = await load(id);
  if (!v) notFound();
  if (v.species_slug !== slug) permanentRedirect(`/species/${v.species_slug}/video/${id}`);

  const { data: others } = await supabasePublic.rpc("public_species_videos", { p_slug: v.species_slug });
  const more = ((others ?? []) as SpeciesVideo[]).filter((o) => o.id !== v.id);

  const heading = videoHeading(v.common_name, v.stage);
  const who = v.full_name || v.username || "a member";
  const pageUrl = `${SITE}/species/${v.species_slug}/video/${v.id}`;
  const portrait = (v.height ?? 0) > (v.width ?? 0);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Species", item: `${SITE}/species` },
        { "@type": "ListItem", position: 2, name: v.common_name, item: `${SITE}/species/${v.species_slug}` },
        { "@type": "ListItem", position: 3, name: `${STAGE_LABEL[v.stage as VideoStage] ?? "Breeding"} video`, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `${heading.charAt(0).toUpperCase()}${heading.slice(1)}`,
      description: describe(v),
      thumbnailUrl: v.poster_url ? [v.poster_url] : undefined,
      uploadDate: v.reviewed_at ?? undefined,
      duration: isoDuration(v.duration_s),
      contentUrl: v.video_url,
      width: v.width ?? undefined,
      height: v.height ?? undefined,
      creator: { "@type": "Person", name: who },
      publisher: { "@type": "Organization", name: "UndergroundAquarium", url: SITE },
      about: {
        "@type": "Thing",
        name: v.common_name,
        alternateName: v.scientific_name ?? undefined,
        url: `${SITE}/species/${v.species_slug}`,
      },
    },
  ];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-2xl mx-auto">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ocean-400 mb-6">
          <Link href="/species" className="hover:text-white transition-colors">
            Species
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/species/${v.species_slug}`} className="hover:text-white transition-colors">
            {v.common_name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-ocean-200">Video</span>
        </nav>

        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-full px-2.5 py-0.5 mb-3">
          <Clapperboard className="h-3.5 w-3.5" /> {STAGE_LABEL[v.stage as VideoStage] ?? "Breeding"}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-1">
          {heading.charAt(0).toUpperCase()}
          {heading.slice(1)}
        </h1>
        {v.scientific_name && <p className="italic text-ocean-300 mb-5">{v.scientific_name}</p>}

        <div className={`overflow-hidden rounded-2xl border border-white/10 bg-black ${portrait ? "mx-auto max-w-sm" : ""}`}>
          <video
            src={v.video_url}
            poster={v.poster_url ?? undefined}
            controls
            playsInline
            preload="metadata"
            width={v.width ?? undefined}
            height={v.height ?? undefined}
            className="block h-auto w-full"
          >
            Your browser can&apos;t play this video.
          </video>
        </div>

        <p className="mt-3 text-sm text-ocean-400">
          Filmed by{" "}
          {v.username ? (
            <Link href={`/u/${v.username}`} className="text-emerald-300 hover:text-emerald-200">
              {who}
            </Link>
          ) : (
            <span className="text-ocean-200">{who}</span>
          )}{" "}
          in their own tank{v.duration_s ? ` · ${clock(v.duration_s)}` : ""}
        </p>
        {v.caption && <p className="mt-3 text-lg text-ocean-200 leading-relaxed">{v.caption}</p>}

        {v.summary && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm uppercase tracking-wide text-ocean-400 mb-1">About the {v.common_name}</p>
            <p className="text-ocean-200">{v.summary}</p>
            <Link
              href={`/species/${v.species_slug}`}
              className="mt-2 inline-block text-sm text-emerald-300 hover:text-emerald-200"
            >
              Full care guide: water, tank size, tankmates →
            </Link>
          </div>
        )}

        {more.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-3">
              More {v.common_name} videos
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {more.map((o) => (
                <Link
                  key={o.id}
                  href={`/species/${v.species_slug}/video/${o.id}`}
                  className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:border-sky-400/40"
                >
                  <div className="relative aspect-video bg-ocean-950/70">
                    {o.poster_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.poster_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white">
                        <Play className="ml-0.5 h-4 w-4 fill-current" />
                      </span>
                    </span>
                  </div>
                  <p className="p-2 text-sm text-white">{STAGE_LABEL[o.stage as VideoStage] ?? "Breeding"}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <Link
            href={`/species/${v.species_slug}`}
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {v.common_name}
          </Link>
        </div>
      </div>
    </main>
  );
}
