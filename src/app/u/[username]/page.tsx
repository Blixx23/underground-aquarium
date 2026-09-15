import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Fish, Waves, MapPin, ExternalLink, User } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import ClubsAndAwards, { type ClubAward } from "@/components/profile/ClubsAndAwards";
import { categoryLabel } from "@/lib/marketplace/categories";
import { formatPrice } from "@/lib/marketplace/listings";
import Certifications, {
  type Certification,
} from "@/components/profile/Certifications";
import ReportButton from "@/components/ReportButton";
import BubbleBadge from "@/components/bubbles/BubbleBadge";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ username: string }> };

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  bubble_balance: number;
  bubble_tier_seen: number | null;
};

type TankItem = { slug: string; qty: number };

type CommunityTank = {
  id: string;
  name: string | null;
  gallons: number | null;
  items: TankItem[] | null;
  images: string[] | null;
  updated_at: string;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const { data: profile } = await supabasePublic
    .from("profiles")
    .select("username, full_name")
    .eq("username", username)
    .maybeSingle();
  const name = profile?.full_name || profile?.username || username;
  return {
    title: `${name} — Community`,
    description: `Aquariums shared by ${name} on Underground Aquarium.`,
  };
}

function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default async function PublicProfilePage({ params }: Params) {
  const { username } = await params;

  const { data: profileData } = await supabasePublic
    .from("profiles")
    .select("id, username, full_name, bio, location, website, deleted_at, suspended_at, bubble_balance, bubble_tier_seen")
    .eq("username", username)
    .maybeSingle();

  if (
    !profileData ||
    (profileData as { deleted_at?: string | null }).deleted_at ||
    (profileData as { suspended_at?: string | null }).suspended_at
  )
    notFound();
  const profile = profileData as Profile;

  const { data: tanksData } = await supabasePublic
    .from("tanks")
    .select("id,name,gallons,items,images,updated_at")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(60);

  const tanks = (tanksData ?? []) as CommunityTank[];
  const displayName = profile.full_name || profile.username || "Aquarist";
  const websiteUrl = profile.website ? normalizeUrl(profile.website) : null;

  const { data: clubsData } = await supabasePublic.rpc("user_clubs_awards", {
    p_user_id: profile.id,
    p_public_only: true,
  });
  const clubs = (clubsData ?? []) as ClubAward[];

  const { data: certData } = await supabasePublic
    .from("course_completions")
    .select("completed_at, courses(slug, title, badge_title, is_published)")
    .eq("user_id", profile.id)
    .order("completed_at", { ascending: false });
  const certs: Certification[] = (
    (certData ?? []) as Array<{
      completed_at: string;
      courses:
        | { slug: string; title: string; badge_title: string; is_published: boolean }
        | { slug: string; title: string; badge_title: string; is_published: boolean }[]
        | null;
    }>
  )
    .map((r) => {
      const c = Array.isArray(r.courses) ? r.courses[0] : r.courses;
      if (!c || !c.is_published) return null;
      return {
        slug: c.slug,
        title: c.title,
        badge_title: c.badge_title,
        completed_at: r.completed_at,
      };
    })
    .filter((x): x is Certification => x !== null);

  type PublicListing = {
    id: string;
    slug: string;
    title: string;
    category: string;
    price_cents: number | null;
    is_wanted: boolean;
    images: string[] | null;
    city: string | null;
  };

  const { data: listingRows } = await supabasePublic
    .from("listings")
    .select("id, slug, title, category, price_cents, is_wanted, images, city")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("bumped_at", { ascending: false })
    .limit(48);
  const openListings = (listingRows ?? []) as unknown as PublicListing[];

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Profile header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-ocean-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl text-white">
              {displayName}
            </h1>
            {profile.username && (
              <p className="text-ocean-400 text-sm">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="text-ocean-300 mt-3 max-w-2xl">{profile.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-ocean-400">
              <BubbleBadge balance={profile.bubble_balance ?? 0} peakRank={profile.bubble_tier_seen ?? 0} />
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {profile.location}
                </span>
              )}
              {websiteUrl && (
                <Link
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300"
                >
                  <ExternalLink className="w-4 h-4" /> Website
                </Link>
              )}
            </div>
          </div>
        </div>

        <ClubsAndAwards rows={clubs} heading="Clubs" />

        <Certifications rows={certs} heading="Awards & Certifications" />

        {/* Their posted tanks */}
        <h2 className="mt-12 font-display text-2xl text-emerald-400 mb-4">
          Posted tanks
        </h2>
        {tanks.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <Fish className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-ocean-400 text-sm">
              {displayName} hasn&apos;t posted any tanks yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tanks.map((t) => {
              const items = Array.isArray(t.items) ? t.items : [];
              const images = Array.isArray(t.images) ? t.images : [];
              const cover = images[0];
              const species = items.length;
              return (
                <Link
                  key={t.id}
                  href={`/tanks/${t.id}`}
                  className="group block rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                >
                  <div className="aspect-[4/3] bg-ocean-950/60 relative">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={t.name ?? "Tank"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Waves className="w-8 h-8 text-ocean-700" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-medium truncate group-hover:text-emerald-300 transition-colors">
                      {t.name ?? "Untitled tank"}
                    </h3>
                    <p className="text-ocean-400 text-sm mt-1">
                      {t.gallons ? `${t.gallons} gal · ` : ""}
                      {species} species
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {openListings.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-2xl text-emerald-400">
              Currently listed
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {openListings.map((l) => {
                const image = l.images?.[0];
                return (
                  <Link
                    key={l.id}
                    href={`/listing/${l.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40 transition-colors hover:border-ocean-600/70"
                  >
                    <div className="flex aspect-square items-center justify-center overflow-hidden bg-ocean-950">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={l.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <Fish className="h-8 w-8 text-ocean-700" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm text-white">{l.title}</p>
                      <p className="mt-0.5 text-xs text-ocean-500">
                        {l.is_wanted ? "Wanted" : formatPrice(l.price_cents)}
                        {" · "}
                        {categoryLabel(l.category)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-12 pt-6 border-t border-ocean-800/40">
          <ReportButton
            targetType="profile"
            targetId={profile.id}
            targetLabel={displayName}
            targetUrl={`/u/${profile.username ?? username}`}
          />
        </div>
      </div>
    </main>
  );
}
