import type { Metadata } from "next";
import Link from "next/link";
import { Fish, Waves, Star } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import CardActions from "@/components/tanks/CardActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Community Tanks",
  description:
    "Browse real aquariums planned and shared by the Underground Aquarium community.",
};

type TankItem = { slug: string; qty: number };

type CommunityTank = {
  id: string;
  user_id: string;
  name: string | null;
  gallons: number | null;
  items: TankItem[] | null;
  images: string[] | null;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
};

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "liked", label: "Most liked" },
  { key: "discussed", label: "Most discussed" },
] as const;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const activeSort = sort === "liked" || sort === "discussed" ? sort : "newest";

  const { data } = await supabasePublic
    .from("tanks")
    .select("id,user_id,name,gallons,items,images,updated_at")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(60);

  const tanks = (data ?? []) as CommunityTank[];
  const tankIds = tanks.map((t) => t.id);

  // Look up each poster's profile
  const userIds = Array.from(
    new Set(tanks.map((t) => t.user_id).filter(Boolean))
  );
  let profileById = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabasePublic
      .from("profiles")
      .select("id,username,full_name")
      .in("id", userIds);
    profileById = new Map(
      ((profiles as ProfileRow[]) ?? []).map((p) => [p.id, p])
    );
  }

  // Tally likes + comments per tank
  let likeCountById = new Map<string, number>();
  let commentCountById = new Map<string, number>();
  if (tankIds.length > 0) {
    const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
      supabasePublic
        .from("tank_likes")
        .select("tank_id")
        .in("tank_id", tankIds),
      supabasePublic
        .from("tank_comments")
        .select("tank_id")
        .in("tank_id", tankIds),
    ]);
    for (const r of (likeRows as { tank_id: string }[]) ?? []) {
      likeCountById.set(r.tank_id, (likeCountById.get(r.tank_id) ?? 0) + 1);
    }
    for (const r of (commentRows as { tank_id: string }[]) ?? []) {
      commentCountById.set(
        r.tank_id,
        (commentCountById.get(r.tank_id) ?? 0) + 1
      );
    }
  }

  // Sort by the active tab (newest already comes from the query)
  const sortedTanks = [...tanks];
  if (activeSort === "liked") {
    sortedTanks.sort(
      (a, b) => (likeCountById.get(b.id) ?? 0) - (likeCountById.get(a.id) ?? 0)
    );
  } else if (activeSort === "discussed") {
    sortedTanks.sort(
      (a, b) =>
        (commentCountById.get(b.id) ?? 0) - (commentCountById.get(a.id) ?? 0)
    );
  }

  // Which of these tanks has the current viewer already liked?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let likedSet = new Set<string>();
  if (user && tankIds.length > 0) {
    const { data: myLikes } = await supabase
      .from("tank_likes")
      .select("tank_id")
      .eq("user_id", user.id)
      .in("tank_id", tankIds);
    likedSet = new Set(
      ((myLikes as { tank_id: string }[]) ?? []).map((r) => r.tank_id)
    );
  }

// Featured = the top tank of the current sort that has a photo
  const featured: CommunityTank | null =
    sortedTanks.find((t) => Array.isArray(t.images) && t.images.length > 0) ??
    null;
  const featuredId = featured?.id;
  const gridTanks = sortedTanks.filter((t) => t.id !== featuredId);

  // Featured display values
  const heroImages = featured && Array.isArray(featured.images) ? featured.images : [];
  const heroCover = heroImages[0];
  const heroSpecies =
    featured && Array.isArray(featured.items) ? featured.items.length : 0;
  const heroProfile = featured ? profileById.get(featured.user_id) : undefined;
  const heroUsername = heroProfile?.username ?? null;
  const heroPosterName =
    heroProfile?.full_name || heroProfile?.username || "An aquarist";
  const heroLikes = featured ? likeCountById.get(featured.id) ?? 0 : 0;
  const heroComments = featured ? commentCountById.get(featured.id) ?? 0 : 0;
  const heroLiked = featured ? likedSet.has(featured.id) : false;

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-8">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Community
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Community tanks
          </h1>
          <p className="text-ocean-300">
            Real aquariums planned and shared by fellow hobbyists. Browse builds
            for inspiration, see what fish live together, then plan your own.
          </p>
        </div>

        {tanks.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <Fish className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No tanks posted yet</p>
            <p className="text-ocean-400 text-sm mb-4">
              Be the first to share a build with the community.
            </p>
            <Link
              href="/tank-builder"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Plan a tank →
            </Link>
          </div>
        ) : (
          <>
            {/* Featured hero */}
            {featured && (
              <div className="mb-8 rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-colors hover:border-emerald-500/40">
                <Link href={`/tanks/${featured.id}`} className="group block">
                  <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-ocean-950/60">
                    {heroCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroCover}
                        alt={featured.name ?? "Featured tank"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Waves className="w-8 h-8 text-ocean-700" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/30 backdrop-blur">
                        <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                        Featured
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="p-5">
                  <Link href={`/tanks/${featured.id}`} className="group">
                    <h2 className="font-display text-2xl text-white group-hover:text-emerald-300 transition-colors">
                      {featured.name ?? "Untitled tank"}
                    </h2>
                  </Link>
                  <p className="text-ocean-400 text-sm mt-1">
                    {featured.gallons ? `${featured.gallons} gal · ` : ""}
                    {heroSpecies} species
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {heroUsername ? (
                      <Link
                        href={`/u/${heroUsername}`}
                        className="text-ocean-500 text-xs hover:text-emerald-300 transition-colors truncate"
                      >
                        by {heroPosterName}
                      </Link>
                    ) : (
                      <p className="text-ocean-500 text-xs truncate">
                        by {heroPosterName}
                      </p>
                    )}
                    <CardActions
                      tankId={featured.id}
                      initialLikes={heroLikes}
                      initialLiked={heroLiked}
                      commentCount={heroComments}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sort tabs (only worth showing once there's more than one to sort) */}
            {gridTanks.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {SORTS.map((opt) => {
                  const active = activeSort === opt.key;
                  return (
                    <Link
                      key={opt.key}
                      href={
                        opt.key === "newest"
                          ? "/community"
                          : `/community?sort=${opt.key}`
                      }
                      className={
                        "rounded-lg px-3 py-1.5 text-sm border transition-colors " +
                        (active
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 text-ocean-300 hover:text-white hover:border-white/20")
                      }
                    >
                      {opt.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {gridTanks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gridTanks.map((t) => {
                  const items = Array.isArray(t.items) ? t.items : [];
                  const images = Array.isArray(t.images) ? t.images : [];
                  const cover = images[0];
                  const species = items.length;
                  const p = profileById.get(t.user_id);
                  const username = p?.username ?? null;
                  const name = p?.full_name || p?.username || "An aquarist";
                  const likes = likeCountById.get(t.id) ?? 0;
                  const comments = commentCountById.get(t.id) ?? 0;
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl bg-white/5 border border-white/10 overflow-hidden transition-colors hover:border-emerald-500/40"
                    >
                      <Link href={`/tanks/${t.id}`} className="group block">
                        <div className="aspect-[4/3] bg-ocean-950/60 relative">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cover}
                              alt={t.name ?? "Community tank"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Waves className="w-8 h-8 text-ocean-700" />
                            </div>
                          )}
                        </div>
                        <div className="px-4 pt-4">
                          <h3 className="text-white font-medium truncate group-hover:text-emerald-300 transition-colors">
                            {t.name ?? "Untitled tank"}
                          </h3>
                          <p className="text-ocean-400 text-sm mt-1">
                            {t.gallons ? `${t.gallons} gal · ` : ""}
                            {species} species
                          </p>
                        </div>
                      </Link>
                      <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2">
                        {username ? (
                          <Link
                            href={`/u/${username}`}
                            className="text-ocean-500 text-xs hover:text-emerald-300 transition-colors truncate"
                          >
                            by {name}
                          </Link>
                        ) : (
                          <p className="text-ocean-500 text-xs truncate">
                            by {name}
                          </p>
                        )}
                        <CardActions
                          tankId={t.id}
                          initialLikes={likes}
                          initialLiked={likedSet.has(t.id)}
                          commentCount={comments}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}