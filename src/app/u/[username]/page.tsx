import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Fish, Waves, MapPin, ExternalLink, User, Users, Crown } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ username: string }> };

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
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
    .select("id, username, full_name, bio, location, website")
    .eq("username", username)
    .maybeSingle();

  if (!profileData) notFound();
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

  const { data: clubsData } = await supabasePublic.rpc(
    "public_clubs_for_user",
    { p_user_id: profile.id }
  );
  const clubs = (clubsData ?? []) as {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    role: string;
  }[];

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

        {clubs.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-2xl text-emerald-400 mb-4">Clubs</h2>
            <div className="flex flex-wrap gap-3">
              {clubs.map((c) => (
                <Link
                  key={c.id}
                  href={`/c/${c.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-ocean-100 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                >
                  {c.role === "owner" ? (
                    <Crown className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Users className="w-4 h-4 text-ocean-400" />
                  )}
                  <span>{c.name}</span>
                  {(c.role === "officer" || c.role === "admin") && (
                    <span className="text-[11px] text-ocean-500 capitalize">
                      · {c.role}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Their posted tanks */}
        <h2 className="font-display text-2xl text-emerald-400 mb-4">
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
      </div>
    </main>
  );
}
