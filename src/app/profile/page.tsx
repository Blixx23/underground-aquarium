import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Wallet, ShoppingBag, Receipt } from "lucide-react";
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

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-28 pb-20">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">Your account</p>
        <h1 className="mb-1 font-display text-3xl text-white">Profile</h1>
        <p className="mb-6 text-sm text-ocean-400">{user.email}</p>
        <ProfileForm userId={user.id} profile={profile} />
      </div>

      <section className="w-full max-w-4xl mt-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-white">Your listings</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-ocean-200 text-sm hover:bg-white/5 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" /> My Orders
            </Link>
            {hasShop && (
              <>
                <Link
                  href="/sell/sales"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-ocean-200 text-sm hover:bg-white/5 transition-colors"
                >
                  <Receipt className="w-4 h-4" /> Sales
                </Link>
                <Link
                  href="/sell/payouts"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-ocean-200 text-sm hover:bg-white/5 transition-colors"
                >
                  <Wallet className="w-4 h-4" /> Payouts
                </Link>
              </>
            )}
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ocean-700 text-white text-sm hover:bg-ocean-600 transition-colors"
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