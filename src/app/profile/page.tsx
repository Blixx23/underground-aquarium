import { redirect } from "next/navigation";
import Link from "next/link";
import { Fish, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

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

  // This user's own listings (via the store they own)
  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id);
  const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);

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
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ocean-700 text-white text-sm hover:bg-ocean-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> New listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-ocean-800/60 bg-ocean-900/30">
            <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
            <p className="text-ocean-300 mb-1">You haven&apos;t listed anything yet</p>
            <p className="text-ocean-500 text-sm mb-5">Your products will show up here once you do.</p>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean-700 text-white text-sm hover:bg-ocean-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create your first listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((p) => {
              const image = p.images?.[0];
              return (
                <Link
                  key={p.id}
                  href={`/marketplace/${p.slug}`}
                  className="group block rounded-xl overflow-hidden bg-ocean-900/60 border border-ocean-800/60 hover:border-ocean-600/70 transition-colors"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-ocean-800 to-ocean-950 flex items-center justify-center overflow-hidden">
                    {image ? (
                      <img src={image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Fish className="w-8 h-8 text-ocean-700" />
                    )}
                    {p.is_active === false && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-full bg-ocean-950/80 text-ocean-300 border border-ocean-700/60">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-white truncate">{p.name}</p>
                    <p className="text-xs text-ocean-300">${Number(p.price).toFixed(2)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}