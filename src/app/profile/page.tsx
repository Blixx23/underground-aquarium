import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Wallet,
  ShoppingBag,
  Receipt,
  Fish,
  Globe,
  Lock,
  User as UserIcon,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";
import ListingsGrid from "./listings-grid";

type Listing = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  images: string[] | null;
  is_active: boolean | null;
};

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
    .select("username, full_name, bio, location, website")
    .eq("id", user.id)
    .maybeSingle();

  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id);
  const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);
  const hasShop = storeIds.length > 0;

  let listings: Listing[] = [];
  if (storeIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug, price, images, is_active")
      .in("store_id", storeIds)
      .order("created_at", { ascending: false });
    listings = (products ?? []) as unknown as Listing[];
  }

  const { data: tanksData } = await supabase
    .from("tanks")
    .select("id, name, gallons, items, updated_at, is_public")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const tanks = (tanksData ?? []) as SavedTank[];

  const displayName = profile?.full_name || profile?.username || "Your profile";

  const actions = [
    { href: "/tank-builder", label: "Tank Builder", Icon: Fish },
    { href: "/sell", label: "New listing", Icon: Plus },
    { href: "/orders", label: "My orders", Icon: ShoppingBag },
    ...(hasShop
      ? [
          { href: "/sell/sales", label: "Sales", Icon: Receipt },
          { href: "/sell/payouts", label: "Payouts", Icon: Wallet },
        ]
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

        {/* Your listings */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl text-white">
            Your listings
          </h2>
          <ListingsGrid listings={listings} />
        </section>

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