import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Fish,
  Waves,
  MapPin,
  ExternalLink,
  CalendarDays,
  Pencil,
  Tag,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { categoryLabel } from "@/lib/marketplace/categories";
import { formatPrice } from "@/lib/marketplace/listings";
import ProfileCourses, { type ProfileCourse } from "@/components/profile/ProfileCourses";
import ReportButton from "@/components/ReportButton";
import BlockButton from "@/components/BlockButton";
import BubbleBadge from "@/components/bubbles/BubbleBadge";
import TrophyShowcase from "@/components/trophies/TrophyShowcase";
import type { TrophyRow } from "@/lib/trophies";
import SocietySeal from "@/components/society/SocietySeal";
import FollowButton from "@/components/FollowButton";
import Avatar from "@/components/profile/Avatar";
import Feed from "@/components/feed/Feed";
import { fetchFeed } from "@/lib/feed";
import { getViewer } from "@/lib/feedViewer";
import { SOCIETY_PATH } from "@/lib/config";
import TankTile from "@/components/tanks/TankTile";
import ProfileHighlights from "@/components/profile/ProfileHighlights";
import BreederCerts, { getBreederCerts } from "@/components/profile/BreederCerts";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  created_at: string | null;
  bubble_balance: number;
  bubble_tier_seen: number | null;
};

type SocietyCard = {
  is_member: boolean;
  member_number: number | null;
  joined_at: string | null;
  points: number;
  title: string | null;
};

type Tank = {
  id: string;
  name: string | null;
  gallons: number | null;
  items: unknown[] | null;
  images: string[] | null;
  description?: string | null;
};

type Listing = {
  id: string;
  slug: string;
  title: string;
  category: string;
  price_cents: number | null;
  is_wanted: boolean;
  is_free: boolean | null;
  images: string[] | null;
  city: string | null;
};

const TABS = [
  { key: "feed", label: "Feed" },
  { key: "tanks", label: "Tanks" },
  { key: "listings", label: "Listings" },
  { key: "courses", label: "Courses" },
  { key: "trophies", label: "Trophies" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const { data } = await supabasePublic
    .from("profiles")
    .select("id, username, full_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();
  const name = data?.full_name || data?.username || username;
  const handle = data?.username ?? username;

  // Empty profiles stay out of Google; ones with a tank, an ad, forum posts
  // or a real bio are worth finding.
  let worthIndexing = (data?.bio ?? "").trim().length >= 40;
  if (!worthIndexing && data?.id) {
    const [{ count: tanks }, { count: ads }, { count: threads }] = await Promise.all([
      supabasePublic.from("tanks").select("id", { count: "exact", head: true }).eq("user_id", data.id).eq("is_public", true),
      supabasePublic
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString()),
      supabasePublic.from("forum_threads").select("id", { count: "exact", head: true }).eq("author_id", data.id).is("hidden_at", null),
    ]);
    worthIndexing = (tanks ?? 0) + (ads ?? 0) + (threads ?? 0) > 0;
  }

  return {
    title: `${name} (@${handle})`,
    description: data?.bio?.slice(0, 160) || `${name} on Underground Aquarium.`,
    // ?tab=tanks, ?tab=listings... are the same profile.
    alternates: { canonical: `/u/${handle}` },
    robots: { index: worthIndexing, follow: true },
    openGraph: data?.avatar_url ? { images: [data.avatar_url] } : undefined,
  };
}

function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default async function PublicProfilePage({ params, searchParams }: Params) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  // ?tab=awards was this tab's old name; keep old links working.
  const wanted = rawTab === "awards" ? "trophies" : rawTab;
  const tab: TabKey = (TABS.find((t) => t.key === wanted)?.key ?? "feed") as TabKey;

  const { data: profileData } = await supabasePublic
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, bio, location, website, created_at, deleted_at, suspended_at, bubble_balance, bubble_tier_seen"
    )
    .eq("username", username)
    .maybeSingle();

  if (!profileData || profileData.deleted_at || profileData.suspended_at) notFound();
  const profile = profileData as unknown as Profile;
  const displayName = profile.full_name?.trim() || profile.username || "Aquarist";
  const handle = profile.username ?? username;
  const base = `/u/${handle}`;

  const { viewer, supabase } = await getViewer();
  const isMe = viewer?.id === profile.id;

  // Everything the header and tabs need, in parallel.
  const [
    { data: cardData },
    { count: followers },
    { count: following },
    { count: tankCount },
    { count: listingCount },
    viewerFollow,
    { count: trophyCount },
    viewerBlock,
    { data: medalData },
  ] = await Promise.all([
    supabasePublic.rpc("society_public_card", { p_user: profile.id }),
    supabasePublic.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabasePublic.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    supabasePublic.from("tanks").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_public", true),
    supabasePublic
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString()),
    viewer && !isMe
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewer.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabasePublic.from("user_trophies").select("trophy_key", { count: "exact", head: true }).eq("user_id", profile.id),
    viewer && !isMe
      ? supabase
          .from("user_blocks")
          .select("blocked_id")
          .eq("blocker_id", viewer.id)
          .eq("blocked_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabasePublic
      .from("course_completions")
      .select("completed_at, courses(slug, title, subtitle, badge_title, cover_image, is_published)")
      .eq("user_id", profile.id)
      .order("completed_at", { ascending: true }),
  ]);

  // Finished courses, oldest first, for the Courses tab (and its count).
  type CourseInfo = {
    slug: string;
    title: string;
    subtitle: string | null;
    badge_title: string;
    cover_image: string | null;
    is_published: boolean;
  };
  type MedalRow = { completed_at: string; courses: CourseInfo | CourseInfo[] | null };
  const completedCourses: ProfileCourse[] = ((medalData ?? []) as MedalRow[])
    .map((r) => {
      const c = Array.isArray(r.courses) ? r.courses[0] : r.courses;
      if (!c || !c.is_published) return null;
      return {
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        badge_title: c.badge_title,
        cover_image: c.cover_image,
        completed_at: r.completed_at,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  let card = ((Array.isArray(cardData) ? cardData[0] : cardData) ?? null) as SocietyCard | null;
  // society_public_card arrives with the feed (step 44). Until it's there,
  // fall back to the trophy case, which also knows who's a member.
  if (!card) {
    const { data: tc } = await supabasePublic.rpc("get_trophy_case", { p_user: profile.id });
    const first = (tc as { is_member?: boolean }[] | null)?.[0];
    if (first?.is_member) {
      card = { is_member: true, member_number: null, joined_at: null, points: 0, title: null };
    }
  }
  const society = Boolean(card?.is_member);
  const memberNo =
    card?.member_number !== null && card?.member_number !== undefined
      ? `UAS-${String(card.member_number).padStart(4, "0")}`
      : null;
  const websiteUrl = profile.website ? normalizeUrl(profile.website) : null;
  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <main className="min-h-screen pb-24">
      {/* Cover */}
      <div className="relative h-44 overflow-hidden sm:h-56">
        {society ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#2a1e08] via-[#120d04] to-ocean-950" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 70% 20%, rgba(217,160,60,0.28) 0%, transparent 60%)",
              }}
            />
            <SocietySeal
              size={340}
              className="pointer-events-none absolute -right-10 -top-16 h-[340px] w-[340px] opacity-[0.12]"
            />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-ocean-700/60 via-ocean-900 to-ocean-950" />
            <div className="water-shimmer absolute inset-0 opacity-40" />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ocean-950 to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Identity */}
        <div className="relative -mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar
              name={displayName}
              src={profile.avatar_url}
              society={society}
              size={120}
              className="ring-4 ring-ocean-950"
            />
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <h1
                  className={`truncate font-display text-2xl sm:text-3xl ${
                    society ? "text-amber-50" : "text-white"
                  }`}
                >
                  {displayName}
                </h1>
                {society && <SocietySeal size={26} className="h-[26px] w-[26px] shrink-0" />}
              </div>
              <p className="text-sm text-ocean-400">@{handle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:pb-2">
            {isMe ? (
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-ocean-200 transition-colors hover:border-white/25 hover:text-white"
              >
                <Pencil className="h-4 w-4" /> Edit profile
              </Link>
            ) : (
              <>
                <FollowButton targetUserId={profile.id} initialFollowing={Boolean(viewerFollow.data)} />
                <Link
                  href={`/messages/new?to=${encodeURIComponent(handle)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-ocean-200 transition-colors hover:border-white/25 hover:text-white"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Society strip */}
        {society && (
          <Link
            href={SOCIETY_PATH}
            className="group mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.05] to-transparent px-4 py-3 text-sm"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300">
              Underground Aquarium Society
            </span>
            {memberNo && <span className="font-mono text-amber-100/80">{memberNo}</span>}
            {card?.title && <span className="font-medium text-amber-200">{card.title}</span>}
            {card && card.points > 0 && <span className="text-amber-100/60">{card.points} pts</span>}
            {card?.joined_at && (
              <span className="text-amber-100/50">Since {new Date(card.joined_at).getFullYear()}</span>
            )}
            <ChevronRight className="ml-auto h-4 w-4 text-amber-400/60 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        {/* Bio, facts, stats */}
        <div className="mt-5 max-w-2xl">
          {profile.bio && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ocean-200">{profile.bio}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ocean-400">
            <BubbleBadge balance={profile.bubble_balance ?? 0} peakRank={profile.bubble_tier_seen ?? 0} />
            {profile.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {profile.location}
              </span>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-ocean-300 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" /> {websiteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            )}
            {joined && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Joined {joined}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href={`${base}/followers`} className="text-ocean-400 hover:text-white">
              <span className="font-semibold text-white">{followers ?? 0}</span> followers
            </Link>
            <Link href={`${base}/following`} className="text-ocean-400 hover:text-white">
              <span className="font-semibold text-white">{following ?? 0}</span> following
            </Link>
            <Link href={`${base}?tab=trophies`} className="text-ocean-400 hover:text-white">
              <span className="font-semibold text-amber-300">{trophyCount ?? 0}</span> trophies
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-ocean-800/60">
          {TABS.map((t) => {
            const count =
              t.key === "tanks"
                ? tankCount
                : t.key === "listings"
                ? listingCount
                : t.key === "courses"
                ? completedCourses.length
                : null;
            const active = tab === t.key;
            return (
              <Link
                key={t.key}
                href={t.key === "feed" ? base : `${base}?tab=${t.key}`}
                scroll={false}
                className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-ocean-400 hover:text-white"
                }`}
              >
                {t.label}
                {count ? <span className="ml-1.5 text-ocean-500">{count}</span> : null}
                {active && (
                  <span
                    className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full ${
                      society ? "bg-amber-400" : "bg-ocean-400"
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6">
          {tab === "feed" && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                <ProfileHighlights profileId={profile.id} base={base} />
                <ProfileFeed profileId={profile.id} isMe={isMe} name={displayName} />
              </div>
              <aside className="hidden lg:block">
                <Sidebar profileId={profile.id} base={base} society={society} card={card} memberNo={memberNo} />
              </aside>
            </div>
          )}
          {tab === "tanks" && <TanksTab profileId={profile.id} name={displayName} />}
          {tab === "listings" && <ListingsTab profileId={profile.id} name={displayName} />}
          {tab === "courses" && (
            <CoursesTab
              name={displayName}
              isMe={isMe}
              viewerId={viewer?.id ?? null}
              completed={completedCourses}
            />
          )}
          {tab === "trophies" && <TrophiesTab profileId={profile.id} name={displayName} isMe={isMe} />}
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-6 border-t border-ocean-800/40 pt-6">
          <ReportButton
            className="flex items-center"
            targetType="profile"
            targetId={profile.id}
            targetLabel={displayName}
            targetUrl={base}
          />
          {viewer && !isMe && (
            <BlockButton
              userId={profile.id}
              name={displayName.split(" ")[0]}
              initialBlocked={Boolean(viewerBlock.data)}
            />
          )}
        </div>
      </div>
    </main>
  );
}

async function ProfileFeed({ profileId, isMe, name }: { profileId: string; isMe: boolean; name: string }) {
  const { viewer, supabase } = await getViewer();
  const { items } = await fetchFeed(supabase, { scope: "user", userId: profileId });
  return (
    <Feed
      scope="user"
      userId={profileId}
      initialItems={items}
      viewer={viewer}
      showComposer={isMe}
      emptyText={isMe ? "Post your first update." : `${name} hasn't posted anything yet.`}
    />
  );
}

/** Desktop sidebar on the feed tab: a glance at their tanks, and their Society standing. */
async function Sidebar({
  profileId,
  base,
  society,
  card,
  memberNo,
}: {
  profileId: string;
  base: string;
  society: boolean;
  card: SocietyCard | null;
  memberNo: string | null;
}) {
  const [{ data }, certs] = await Promise.all([
    supabasePublic
      .from("tanks")
      .select("id, name, images")
      .eq("user_id", profileId)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(6),
    getBreederCerts(profileId),
  ]);
  const tanks = (data ?? []) as Pick<Tank, "id" | "name" | "images">[];

  return (
    <div className="sticky top-24 space-y-4">
      {society && card && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.10] to-transparent p-5">
          <SocietySeal size={140} className="pointer-events-none absolute -right-8 -top-8 h-[140px] w-[140px] opacity-20" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80">The Society</p>
          <p className="mt-2 font-display text-xl text-amber-50">{card.title ?? "Member"}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            {memberNo && (
              <div className="flex justify-between">
                <dt className="text-amber-100/50">Member No.</dt>
                <dd className="font-mono text-amber-100">{memberNo}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-amber-100/50">BAP points</dt>
              <dd className="text-amber-100">{card.points}</dd>
            </div>
            {card.joined_at && (
              <div className="flex justify-between">
                <dt className="text-amber-100/50">Member since</dt>
                <dd className="text-amber-100">{new Date(card.joined_at).getFullYear()}</dd>
              </div>
            )}
          </dl>
          <BreederCerts
            certs={certs}
            limit={5}
            moreHref={`${base}?tab=trophies`}
            className="relative mt-4 border-t border-amber-500/20 pt-3"
          />
          <Link href={`${base}?tab=trophies`} className="relative mt-3 inline-block text-sm text-amber-300 hover:text-amber-200">
            Trophy case →
          </Link>
        </div>
      )}
      {!(society && card) && certs.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
          <BreederCerts certs={certs} limit={5} moreHref={`${base}?tab=trophies`} />
        </div>
      )}

      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-white">Tanks</p>
          {tanks.length > 0 && (
            <Link href={`${base}?tab=tanks`} className="text-xs text-ocean-400 hover:text-white">
              See all
            </Link>
          )}
        </div>
        {tanks.length === 0 ? (
          <p className="text-sm text-ocean-500">No tanks shared yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {tanks.map((t) => (
              <Link
                key={t.id}
                href={`/tanks/${t.id}`}
                title={t.name ?? "Tank"}
                className="block aspect-square overflow-hidden rounded-lg bg-ocean-950"
              >
                {t.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center">
                    <Waves className="h-5 w-5 text-ocean-700" />
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function TanksTab({ profileId, name }: { profileId: string; name: string }) {
  const q = (cols: string) =>
    supabasePublic
      .from("tanks")
      .select(cols)
      .eq("user_id", profileId)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(60);
  let { data, error } = await q("id, name, gallons, items, images, description");
  if (error) ({ data } = await q("id, name, gallons, items, images"));
  const tanks = (data ?? []) as unknown as Tank[];

  if (tanks.length === 0) return <Empty icon={Fish} text={`${name} hasn't shared any tanks yet.`} />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tanks.map((t) => (
        <TankTile key={t.id} tank={t} />
      ))}
    </div>
  );
}

async function ListingsTab({ profileId, name }: { profileId: string; name: string }) {
  const { data } = await supabasePublic
    .from("listings")
    .select("id, slug, title, category, price_cents, is_wanted, is_free, images, city")
    .eq("user_id", profileId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("bumped_at", { ascending: false })
    .limit(48);
  const listings = (data ?? []) as Listing[];

  if (listings.length === 0) return <Empty icon={Tag} text={`${name} has nothing listed right now.`} />;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((l) => (
        <Link
          key={l.id}
          href={`/listing/${l.slug}`}
          className="group block overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40 transition-colors hover:border-ocean-600/70"
        >
          <div className="flex aspect-square items-center justify-center overflow-hidden bg-ocean-950">
            {l.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={l.images[0]}
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
            <p className="mt-0.5 truncate text-xs text-ocean-500">
              {l.is_wanted ? "Wanted" : l.is_free ? "Free" : formatPrice(l.price_cents)}
              {" · "}
              {categoryLabel(l.category)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function CoursesTab({
  name,
  isMe,
  viewerId,
  completed,
}: {
  name: string;
  isMe: boolean;
  viewerId: string | null;
  completed: ProfileCourse[];
}) {
  // Which of these the person looking has finished, so they get "You've
  // earned this one too" instead of an invite. On your own profile, also the
  // published courses you haven't finished yet.
  const [{ data: viewerRows }, { data: allCourses }] = await Promise.all([
    viewerId && !isMe
      ? supabasePublic.from("course_completions").select("courses(slug)").eq("user_id", viewerId)
      : Promise.resolve({ data: [] as { courses: unknown }[] }),
    isMe
      ? supabasePublic
          .from("courses")
          .select("slug, title, subtitle, badge_title, cover_image")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as ProfileCourse[] }),
  ]);

  const viewerCompleted = ((viewerRows ?? []) as { courses: unknown }[])
    .map((r) => {
      const c = (Array.isArray(r.courses) ? r.courses[0] : r.courses) as { slug?: string } | null;
      return c?.slug ?? null;
    })
    .filter((x): x is string => !!x);

  const done = new Set(completed.map((c) => c.slug));
  const notYet = ((allCourses ?? []) as ProfileCourse[]).filter((c) => !done.has(c.slug));

  return (
    <ProfileCourses
      name={name}
      isMe={isMe}
      signedIn={!!viewerId}
      completed={completed}
      viewerCompleted={viewerCompleted}
      notYet={notYet}
    />
  );
}

async function TrophiesTab({ profileId, name, isMe }: { profileId: string; name: string; isMe: boolean }) {
  const { supabase } = await getViewer();
  const [{ data: trophyRows }, breederCerts] = await Promise.all([
    supabase.rpc("get_trophy_case", { p_user: profileId }),
    getBreederCerts(profileId),
  ]);

  return (
    <div>
      {isMe && (
        <p className="mb-6 text-sm text-ocean-400">
          This is how others see your trophies.{" "}
          <Link href="/trophies" className="text-ocean-200 hover:text-white">
            Open your full cabinet
          </Link>{" "}
          to see everything you can earn and how close you are.
        </p>
      )}
      {breederCerts.length > 0 && (
        <div className="mb-8 max-w-md rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
          <BreederCerts certs={breederCerts} />
        </div>
      )}
      {/* Course certificates live in the Courses tab now. */}
      <TrophyShowcase rows={(trophyRows ?? []) as TrophyRow[]} name={name} isSelf={isMe} />
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Fish; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ocean-800/60 px-6 py-14 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
      <p className="text-sm text-ocean-400">{text}</p>
    </div>
  );
}
