import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/marketplace/listings";
import { thumb } from "@/lib/images/thumb";
import NoPhoto from "@/components/marketplace/NoPhoto";

export const metadata = { title: "Saved ads" };
export const dynamic = "force-dynamic";

type Saved = {
  listing_id: string;
  created_at: string;
  listings: {
    slug: string;
    title: string;
    price_cents: number | null;
    is_wanted: boolean;
    category: string;
    images: string[] | null;
    status: string;
    city: string | null;
  } | null;
};

/** The ads a member hearted. Sold ones stay listed (marked) so nothing just vanishes. */
export default async function SavedAdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/saved");

  // Read with the server key (only this member's own saves) so ads that have
  // since sold still show, marked, instead of silently disappearing.
  const { data } = await supabaseAdmin
    .from("listing_saves")
    .select("listing_id, created_at, listings(slug, title, price_cents, is_wanted, category, images, status, city)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const saved = ((data ?? []) as unknown as Saved[]).filter((s) => s.listings);

  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl text-white">Saved ads</h1>
        <p className="mt-1 text-ocean-400">We&apos;ll let you know if one of these drops in price or sells.</p>

        {saved.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-ocean-500" />
            <p className="mt-3 text-ocean-300">
              No saved ads yet. Tap <span className="text-white">Save this ad</span> on any ad to keep it here.
            </p>
            <Link href="/marketplace" className="mt-4 inline-block text-emerald-300 hover:text-emerald-200">
              Browse classifieds
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {saved.map((s) => {
              const l = s.listings!;
              const img = l.images?.[0] ?? null;
              const gone = l.status !== "active";
              return (
                <Link
                  key={s.listing_id}
                  href={`/listing/${l.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/50 hover:border-ocean-600/70"
                >
                  <div className="relative aspect-[4/3] bg-ocean-900">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb(img, 640)} alt={l.title} loading="lazy" className={`h-full w-full object-cover ${gone ? "opacity-40" : ""}`} />
                    ) : (
                      <NoPhoto category={l.is_wanted ? "wanted" : l.category} showLabel={false} />
                    )}
                    {gone && (
                      <span className="absolute left-2 top-2 rounded-full bg-ocean-950/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ocean-200">
                        {l.status === "sold" ? "Sold" : "No longer listed"}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm text-white">{l.title}</p>
                    {!l.is_wanted && <p className="mt-1 text-sm text-emerald-300">{formatPrice(l.price_cents)}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
