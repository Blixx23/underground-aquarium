import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Fish,
  Globe,
  Lock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Settings,
  Trophy,
  Pencil,
  ScrollText,
  Wrench,
  Droplets,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";
import BubbleBadge from "@/components/bubbles/BubbleBadge";
import Certifications, {
  type Certification,
} from "@/components/profile/Certifications";
import AvatarUpload from "@/components/profile/AvatarUpload";
import SignOutButton from "@/components/profile/SignOutButton";
import SocietySeal from "@/components/society/SocietySeal";
import { SOCIETY_HOME_PATH, SOCIETY_PATH } from "@/lib/config";

export const metadata: Metadata = { title: "Your profile" };

type SavedTank = {
  id: string;
  name: string;
  gallons: number | null;
  items: unknown[] | null;
  updated_at: string;
  is_public: boolean;
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const editing = (await searchParams).edit === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, bio, location, website, avatar_url, is_admin, bubble_balance, bubble_tier_seen")
    .eq("id", user.id)
    .maybeSingle();

  const { data: tanksData } = await supabase
    .from("tanks")
    .select("id, name, gallons, items, updated_at, is_public")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const tanks = (tanksData ?? []) as SavedTank[];

  const { data: certData } = await supabase
    .from("course_completions")
    .select("completed_at, courses(slug, title, badge_title, is_published)")
    .eq("user_id", user.id)
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

  const { data: cardData } = await supabase.rpc("society_public_card", { p_user: user.id });
  const card = (Array.isArray(cardData) ? cardData[0] : cardData) as
    | { is_member?: boolean; member_number?: number | null; title?: string | null }
    | null;
  const inSociety = Boolean(card?.is_member);

  const displayName = profile?.full_name || profile?.username || "Your profile";
  const isAdmin = Boolean(profile?.is_admin);

  // Messages, notifications, the feed and posting already live on the
  // top and bottom bars, so this page only holds what's yours.
  const groups: { title: string; items: { href: string; label: string; Icon: typeof Store }[] }[] = [
    {
      title: "Your stuff",
      items: [
        ...(profile?.username
          ? [{ href: `/u/${profile.username}`, label: "Public profile", Icon: ExternalLink }]
          : []),
        { href: "/my/listings", label: "My listings", Icon: Store },
        { href: "/my/shops", label: "My shops", Icon: Store },
        { href: "#tanks", label: "My tanks", Icon: Fish },
        { href: "/trophies", label: "Trophies", Icon: Trophy },
        ...(inSociety ? [{ href: "/society/certificates", label: "Certificates", Icon: ScrollText }] : []),
      ],
    },
    {
      title: "Tools",
      items: [
        { href: "/tank-builder", label: "Tank Builder", Icon: Wrench },
        { href: "/water-check", label: "Water Check", Icon: Droplets },
      ],
    },
    {
      title: "Settings",
      items: [
        { href: "/account", label: "Account & data", Icon: Settings },
        ...(isAdmin ? [{ href: "/admin", label: "Admin", Icon: ShieldCheck }] : []),
      ],
    },
  ];

  return (
    <main className="min-h-screen px-4 pt-28 pb-20">
      <div className="mx-auto w-full max-w-4xl">
        {/* Identity header */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur">
          <div className="flex items-start gap-4">
            <AvatarUpload
              userId={user.id}
              name={displayName}
              initialUrl={profile?.avatar_url ?? null}
              society={inSociety}
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl text-white sm:text-3xl">
                {displayName}
              </h1>
              {profile?.username && (
                <p className="text-sm text-ocean-400">@{profile.username}</p>
              )}
              <p className="mt-0.5 truncate text-sm text-ocean-500">
                {user.email}
              </p>
              {profile?.location && (
                <p className="mt-1 flex items-center gap-1 text-sm text-ocean-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </p>
              )}
              <div className="mt-2.5">
                <BubbleBadge balance={profile?.bubble_balance ?? 0} peakRank={profile?.bubble_tier_seen ?? 0} />
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              {!editing && (
                <Link
                  href="/profile?edit=1"
                  scroll={false}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-ocean-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-ocean-500"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit profile
                </Link>
              )}
              {profile?.username && (
                <Link
                  href={`/u/${profile.username}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-ocean-200 transition-colors hover:bg-white/5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">View public profile</span>
                  <span className="sm:hidden">Public</span>
                </Link>
              )}
            </div>
          </div>

          {/* Editing happens right here, under your name, not at the bottom of the page. */}
          {editing && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <ProfileForm userId={user.id} profile={profile} />
            </div>
          )}
        </div>

        {/* Society */}
        <Link
          href={inSociety ? SOCIETY_HOME_PATH : SOCIETY_PATH}
          className={`mt-6 flex items-center gap-4 rounded-2xl border p-5 transition-colors ${
            inSociety
              ? "border-amber-500/35 bg-gradient-to-r from-amber-500/[0.12] to-transparent hover:border-amber-400/60"
              : "border-white/10 bg-white/5 hover:border-amber-500/40"
          }`}
        >
          <SocietySeal size={48} className="h-12 w-12 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-amber-50">
              {inSociety ? "Society member area" : "Join the Underground Aquarium Society"}
            </span>
            <span className="block text-sm text-amber-100/60">
              {inSociety
                ? [
                    card?.member_number ? `UAS-${String(card.member_number).padStart(4, "0")}` : null,
                    card?.title,
                    "Spawn logs, breeder program, certificates",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Judged breeder awards, signed certificates and Society trophies."}
            </span>
          </span>
        </Link>

        {/* Your stuff, tools, settings */}
        {groups.map((g) => (
          <div key={g.title} className="mt-7">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-ocean-500">{g.title}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {g.items.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center transition-colors hover:border-ocean-500/40 hover:bg-white/10"
                >
                  <a.Icon className="h-5 w-5 text-ocean-300" />
                  <span className="text-xs leading-tight text-ocean-200">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-3">
          <SignOutButton />
        </div>

        {/* Certifications */}
        <Certifications
          rows={certs}
          heading="Awards & Certifications"
          emptyText="You haven't earned any certifications yet."
        />

        {/* Your tanks */}
        <section id="tanks" className="mt-10 scroll-mt-24">
          <h2 className="mb-4 font-display text-2xl text-white">Your tanks</h2>
          {tanks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="mb-2 text-sm text-ocean-300">
                You haven&apos;t saved any tanks yet.
              </p>
              <Link
                href="/tank-builder"
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
              >
                Plan your first tank →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tanks.map((t) => {
                const count = Array.isArray(t.items) ? t.items.length : 0;
                return (
                  <Link
                    key={t.id}
                    href={`/tanks/${t.id}`}
                    className="block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-emerald-500/40 hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium text-white">
                        {t.name}
                      </h3>
                      {t.is_public ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300/90">
                          <Globe className="h-2.5 w-2.5" /> Posted
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ocean-400">
                          <Lock className="h-2.5 w-2.5" /> Private
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ocean-400">
                      {t.gallons ? `${t.gallons} gal · ` : ""}
                      {count} species
                    </p>
                    <p className="mt-2 text-xs text-ocean-500">
                      Updated {new Date(t.updated_at).toLocaleDateString()}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
