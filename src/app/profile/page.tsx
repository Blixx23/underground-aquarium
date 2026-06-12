import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Wallet, ShoppingBag, Receipt, Fish, Globe, Lock } from "lucide-react";
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

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-28 pb-20">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">Your account</p>
        <h1 className="mb-1 font-display text-3xl text-white">Profile</h1>
        <p className="mb-6 text-sm text-ocean-400">{user.email}</p>
        <ProfileForm userId={user.id} profile={profile} />
      </div>

      {/* Saved tanks */}
      <section className="w-full max-w-4xl mt-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="font-display text-2xl text-white">Your saved tanks</h2>
          <Link
            href="/tank-builder"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-ocean-200 text-sm hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <Fish className="w-4 h-4" /> Tank Builder
          </Link>
        </div>

        {tanks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-ocean-300 text-sm mb-2">
              You haven&apos;t saved any tanks yet.
            </p>
            <Link
              href="/tank-builder"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Plan your first tank →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tanks.map((t) => {
              const count = Array.isArray(t.items) ? t.items.length : 0;
              return (
                <Link
                  key={t.id}
                  href={`/tanks/${t.id}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-white font-medium truncate">{t.name}</h3>
                    {t.is_public ? (
                      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] uppercase tracking-wide text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                        <Globe className="w-2.5 h-2.5" /> Posted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] uppercase tracking-wide text-ocean-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                        <Lock className="w-2.5 h-2.5" /> Private
                      </span>
                    )}
                  </div>
                  <p className="text-ocean-400 text-sm mt-1">
                    {t.gallons ? `${t.gallons} gal · ` : ""}
                    {count} species
                  </p>
                  <p className="text-ocean-500 text-xs mt-2">
                    Updated {new Date(t.updated_at).toLocaleDateString()}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="w-full max-w-4xl mt-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="font-display text-2xl text-white">Your listings</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-ocean-200 text-sm hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" /> My Orders
            </Link>
            {hasShop && (
              <>
                <Link
                  href="/sell/sales"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-ocean-200 text-sm hover:bg-white/5 transition-colors whitespace-nowrap"
                >
                  <Receipt className="w-4 h-4" /> Sales
                </Link>
                <Link
                  href="/sell/payouts"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-ocean-200 text-sm hover:bg-white/5 transition-colors whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4" /> Payouts
                </Link>
              </>
            )}
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ocean-700 text-white text-sm hover:bg-ocean-600 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> New listing
            </Link>
          </div>
        </div>

        <ListingsGrid listings={listings} />
      </section>
    </main>
  );
}