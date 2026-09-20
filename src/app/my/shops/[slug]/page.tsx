import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Heart, Star, Newspaper, Megaphone } from "lucide-react";
import { requireOwnedStore } from "@/lib/stores/owner";
import ShopStats from "@/components/stores/ShopStats";

export const metadata: Metadata = { title: "Shop overview" };
export const dynamic = "force-dynamic";

export default async function ShopOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, supabase } = await requireOwnedStore(slug);

  const [{ data: mine }, { count: postCount }, { count: photoCount }] = await Promise.all([
    supabase.rpc("my_stores"),
    supabase.from("store_posts").select("id", { count: "exact", head: true }).eq("store_id", store.id),
    supabase.from("store_photos").select("id", { count: "exact", head: true }).eq("store_id", store.id),
  ]);
  const row = ((mine ?? []) as { slug: string; views30?: number; followers?: number; reviews?: number }[]).find(
    (r) => r.slug === slug
  );

  const todo = [
    { done: (postCount ?? 0) > 0, label: "Post an update: a restock, a sale, an event", href: `/my/shops/${slug}/updates` },
    { done: (photoCount ?? 0) > 0, label: "Add a few photos of the shop", href: `/my/shops/${slug}/photos` },
    { done: Boolean(store.description), label: "Write a short description", href: `/my/shops/${slug}/hours` },
    { done: Boolean(store.hours), label: "Set your opening hours", href: `/my/shops/${slug}/hours` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Views, 30 days" value={row?.views30 ?? 0} Icon={Eye} />
        <Tile label="Following" value={row?.followers ?? 0} Icon={Heart} />
        <Tile label="Reviews" value={row?.reviews ?? 0} Icon={Star} />
        <Tile label="Updates posted" value={postCount ?? 0} Icon={Newspaper} />
      </div>

      <ShopStats storeId={store.id} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-1 font-display text-lg text-white">Getting the most out of your page</h2>
        <p className="mb-3 text-sm text-ocean-400">
          Nothing is sold through Underground Aquarium and we take no cut. Your page exists to send
          people to your shop.
        </p>
        <ul className="space-y-2">
          {todo.map((t) => (
            <li key={t.label}>
              <Link href={t.href} className="flex items-center gap-3 text-sm hover:underline">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    t.done ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300" : "border-ocean-700 text-ocean-600"
                  }`}
                >
                  {t.done ? "✓" : ""}
                </span>
                <span className={t.done ? "text-ocean-500 line-through" : "text-ocean-200"}>{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={`/my/shops/${slug}/promotions`}
        className="flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.12] to-transparent p-5 transition-colors hover:border-emerald-400/60"
      >
        <Megaphone className="h-6 w-6 shrink-0 text-emerald-300" />
        <span>
          <span className="block font-medium text-white">Free marketing kit</span>
          <span className="block text-sm text-ocean-300">
            Window signs and counter cards with your own QR code, plus a badge for your website.
          </span>
        </span>
      </Link>
    </div>
  );
}

function Tile({ label, value, Icon }: { label: string; value: number; Icon: typeof Eye }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-0.5 font-display text-2xl text-white">{value.toLocaleString()}</p>
    </div>
  );
}
