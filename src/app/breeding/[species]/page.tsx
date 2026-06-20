import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Fish, Leaf } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

const SITE = "https://www.undergroundaquarium.com";

type Params = { params: Promise<{ species: string }> };

type Guide = {
  id: string;
  program: string;
  species_name: string;
  notes: string | null;
  photos: string[] | null;
  event_date: string | null;
  created_at: string;
  club_name: string;
  club_slug: string;
  club_is_public: boolean;
  breeder_username: string | null;
  breeder_name: string | null;
};

async function fetchGuides(speciesSlug: string): Promise<Guide[]> {
  const { data } = await supabasePublic
    .from("public_breeding_guides")
    .select("*")
    .eq("species_slug", speciesSlug)
    .order("created_at", { ascending: false });
  return (data ?? []) as Guide[];
}

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const { species } = await params;
  const guides = await fetchGuides(species);
  if (guides.length === 0) return { title: "Breeding guide not found" };

  const name = guides[0].species_name;
  const count = guides.length;
  const description = `How aquarium hobbyists bred ${name} — real spawn reports with tank setup, water parameters, and photos. ${count} breeding ${
    count === 1 ? "guide" : "guides"
  } from UndergroundAquarium club members.`;
  const url = `/breeding/${species}`;
  const firstPhoto = guides.find(
    (g) => Array.isArray(g.photos) && g.photos.length > 0
  )?.photos?.[0];

  return {
    title: `Breeding ${name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `How to Breed ${name} — Hobbyist Guides`,
      description,
      url: `${SITE}${url}`,
      images: [firstPhoto ?? "/og-default.png"],
    },
    twitter: {
      card: "summary_large_image",
      images: [firstPhoto ?? "/og-default.png"],
    },
  };
}

export default async function SpeciesGuide({ params }: Params) {
  const { species } = await params;
  const guides = await fetchGuides(species);
  if (guides.length === 0) notFound();

  const name = guides[0].species_name;
  const isPlant = guides[0].program === "hap";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `How to Breed ${name}`,
    about: name,
    description: `Hobbyist breeding reports for ${name}.`,
    url: `${SITE}/breeding/${species}`,
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto">
        <Link
          href="/breeding"
          className="inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-ocean-200 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> All breeding guides
        </Link>

        <div className="flex items-center gap-2 text-ocean-400 mb-2">
          {isPlant ? <Leaf className="h-5 w-5" /> : <Fish className="h-5 w-5" />}
          <span className="text-sm uppercase tracking-wide">
            {isPlant ? "Propagation" : "Breeding"} guide
          </span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-white mb-2">
          {name}
        </h1>
        <p className="text-ocean-300 mb-10">
          {guides.length} {guides.length === 1 ? "report" : "reports"} from
          hobbyists who&apos;ve bred {name}.
        </p>

        <div className="space-y-6">
          {guides.map((g) => {
            const date = fmtDate(g.event_date) ?? fmtDate(g.created_at);
            const photos = Array.isArray(g.photos) ? g.photos : [];
            return (
              <article
                key={g.id}
                className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5"
              >
                <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  {g.breeder_username ? (
                    <Link
                      href={`/u/${g.breeder_username}`}
                      className="font-medium text-white hover:text-ocean-200"
                    >
                      {g.breeder_name || g.breeder_username}
                    </Link>
                  ) : (
                    <span className="font-medium text-white">A club member</span>
                  )}
                  <span className="text-ocean-500">·</span>
                  {g.club_is_public ? (
                    <Link
                      href={`/c/${g.club_slug}`}
                      className="text-ocean-400 hover:text-ocean-200"
                    >
                      {g.club_name}
                    </Link>
                  ) : (
                    <span className="text-ocean-400">{g.club_name}</span>
                  )}
                  {date && (
                    <>
                      <span className="text-ocean-500">·</span>
                      <span className="text-ocean-500">{date}</span>
                    </>
                  )}
                </div>

                {g.notes ? (
                  <p className="mb-4 whitespace-pre-wrap text-ocean-200">
                    {g.notes}
                  </p>
                ) : (
                  <p className="mb-4 italic text-ocean-500">
                    No write-up provided.
                  </p>
                )}

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-28 w-28 overflow-hidden rounded-lg border border-ocean-800/60"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`${name} photo ${i + 1}`}
                          className="h-full w-full object-cover transition-transform hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
