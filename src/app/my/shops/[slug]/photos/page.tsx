import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import { supabaseAdmin } from "@/lib/supabase/admin";
import StorePhotos, { type StorePhoto } from "@/components/stores/StorePhotos";
import BrandingButton from "@/components/stores/BrandingButton";
import ShopLogo from "@/components/stores/ShopLogo";

export const metadata: Metadata = { title: "Banner, logo & photos" };
export const dynamic = "force-dynamic";

export default async function ShopPhotosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, supabase, user } = await requireOwnedStore(slug);

  // Banner and logo arrive with step 61; before that, both just read as empty.
  const { data: brand } = await supabaseAdmin
    .from("fish_stores")
    .select("cover_url, logo_url")
    .eq("id", store.id)
    .maybeSingle();
  const coverUrl = (brand as { cover_url?: string | null } | null)?.cover_url ?? null;
  const logoUrl = (brand as { logo_url?: string | null } | null)?.logo_url ?? null;

  const { data } = await supabase
    .from("store_photos")
    .select("id, url, caption")
    .eq("store_id", store.id)
    .order("sort")
    .order("created_at");

  const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-5";

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 font-display text-lg text-white">Banner</h2>
        <p className="mb-3 text-sm text-ocean-400">
          The wide photo across the top of your shop page, like a Facebook cover. Your storefront, your best
          display tank or your sign all work well. Wide photos look best.
        </p>
        <div className={card}>
          <div className="mb-4 aspect-[16/5] w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-ocean-800 via-ocean-900 to-[#03141f]">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="Your banner" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ocean-500">
                No banner yet. Your page shows a plain ocean banner with your name.
              </div>
            )}
          </div>
          <BrandingButton storeId={store.id} userId={user.id} kind="cover" hasImage={!!coverUrl} variant="panel" />
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg text-white">Logo</h2>
        <p className="mb-3 text-sm text-ocean-400">
          The round picture next to your name, and on every post you make. Square logos look best.
        </p>
        <div className={`${card} flex flex-wrap items-center gap-5`}>
          <ShopLogo name={store.name} url={logoUrl} size={96} className="ring-4 ring-ocean-950" />
          <BrandingButton storeId={store.id} userId={user.id} kind="logo" hasImage={!!logoUrl} variant="panel" />
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg text-white">Gallery photos</h2>
        <p className="mb-3 text-sm text-ocean-400">
          The quickest way to share photos now is a post on your Posts tab: they show on your page and collect in
          your Photos tab. Photos you added here before still show on your page too. Remove any you don&apos;t want.
        </p>
        <StorePhotos
          storeId={store.id}
          userId={user.id}
          initial={(data ?? []) as StorePhoto[]}
          isOwner
          heading={false}
        />
      </section>
    </div>
  );
}
