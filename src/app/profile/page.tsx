import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ShoppingBag,
  Store,
  Fish,
  Globe,
  Lock,
  User as UserIcon,
  MapPin,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";
import ClubsAndAwards, { type ClubAward } from "@/components/profile/ClubsAndAwards";

type SavedTank = {
  id: string;
  name: string;
  gallons: number | null;
  items: unknown[] | null;
  updated_at: string;
  is_public: boolean;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, bio, location, website, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id);
  const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);
  const hasShop = storeIds.length > 0;

  const { data: tanksData } = await supabase
    .from("tanks")
    .select("id, name, gallons, items, updated_at, is_public")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const tanks = (tanksData ?? []) as SavedTank[];

  const { data: clubAwards } = await supabase.rpc("user_clubs_awards", {
    p_user_id: user.id,
  });
  const clubs = (clubAwards ?? []) as ClubAward[];

  const displayName = profile?.full_name || profile?.username || "Your profile";
  const isAdmin = Boolean(profile?.is_admin);

  const actions = [
    { href: "/tank-builder", label: "Tank Builder", Icon: Fish },
    { href: "/orders", label: "My orders", Icon: ShoppingBag },
    hasShop
      ? { href: "/sell/listings", label: "Seller Hub", Icon: Store }
      : { href: "/sell", label: "Start selling", Icon: Plus },
    ...(isAdmin
      ? [{ href: "/admin", label: "Admin", Icon: ShieldCheck }]
      : []),
  ];

  return (
    <main className="min-h-screen px-4 pt-28 pb-20">
      <div className="mx-auto w-full max-w-4xl">
        {/* Identity header */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ocean-800/60">
              <UserIcon className="h-7 w-7 text-ocean-300" />
            </div>
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
            </div>
            {profile?.username && (
              <Link
                href={`/u/${profile.username}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-ocean-200 transition-colors hover:bg-white/5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View public profile</span>
                <span className="sm:hidden">Public</span>
              </Link>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-8">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">
            Quick actions
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center transition-colors hover:border-emerald-500/40 hover:bg-white/10"
              >
                <a.Icon className="h-5 w-5 text-ocean-300" />
                <span className="text-sm text-ocean-200">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Your tanks */}
        <section className="mt-10">
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

        <ClubsAndAwards rows={clubs} emptyText="You’re not in any clubs yet." />

        {/* Edit profile */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl text-white">Edit profile</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <ProfileForm userId={user.id} profile={profile} />
          </div>
        </section>
      </div>
    </main>
  );
}
