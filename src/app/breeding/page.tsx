import type { Metadata } from "next";
import Link from "next/link";
import { Fish, Leaf } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

const SITE = "https://www.undergroundaquarium.com";

export const metadata: Metadata = {
  title: "Breeding Guides",
  description:
    "Real spawn reports and propagation write-ups from aquarium hobbyists — how they bred each species, with photos. Browse breeding guides by species at UndergroundAquarium.",
  alternates: { canonical: "/breeding" },
  openGraph: {
    title: "Breeding Guides — UndergroundAquarium",
    description:
      "Real spawn reports and propagation write-ups from aquarium hobbyists, organized by species.",
    url: `${SITE}/breeding`,
    images: ["/og-default.png"],
  },
  twitter: { card: "summary_large_image", images: ["/og-default.png"] },
};

type Row = {
  species_name: string;
  species_slug: string;
  program: string;
  photos: string[] | null;
};

export default async function BreedingIndex() {
  const { data } = await supabasePublic
    .from("public_breeding_guides")
    .select("species_name, species_slug, program, photos");

  const rows = (data ?? []) as Row[];

  const map = new Map<
    string,
    { name: string; slug: string; program: string; count: number; photo: string | null }
  >();
  for (const r of rows) {
    const photo =
      Array.isArray(r.photos) && r.photos.length > 0 ? r.photos[0] : null;
    const ex = map.get(r.species_slug);
    if (ex) {
      ex.count += 1;
      if (!ex.photo && photo) ex.photo = photo;
    } else {
      map.set(r.species_slug, {
        name: r.species_name,
        slug: r.species_slug,
        program: r.program,
        count: 1,
        photo,
      });
    }
  }
  const species = Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-4xl sm:text-5xl text-white mb-3">
          Breeding Guides
        </h1>
        <p className="text-ocean-300 mb-10 max-w-2xl">
          Real spawn reports and propagation write-ups from hobbyists across our
          clubs — how they actually did it, with photos. Browse by species.
        </p>

        {species.length === 0 ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-8 text-center text-ocean-400">
            No breeding guides yet. When club members share their approved spawn
            reports, they&apos;ll appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {species.map((sp) => (
              <Link
                key={sp.slug}
                href={`/breeding/${sp.slug}`}
                className="group rounded-2xl border border-ocean-800/60 bg-ocean-900/40 overflow-hidden hover:border-ocean-600 transition-colors"
              >
                <div className="aspect-[4/3] bg-ocean-950/60 overflow-hidden">
                  {sp.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sp.photo}
                      alt={sp.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ocean-700">
                      {sp.program === "hap" ? (
                        <Leaf className="h-10 w-10" />
                      ) : (
                        <Fish className="h-10 w-10" />
                      )}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-display text-lg text-white">{sp.name}</h2>
                  <p className="text-sm text-ocean-500">
                    {sp.count} {sp.count === 1 ? "guide" : "guides"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
