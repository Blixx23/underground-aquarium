import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, ExternalLink, MessageSquare, Eye, Heart, Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ShopStats from "@/components/stores/ShopStats";

export const metadata: Metadata = { title: "My shops" };

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  views30: number;
  followers: number;
  reviews: number;
  unanswered: number;
  stock_count: number;
  last_post: string | null;
};

export default async function MyShopsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/shops");

  const { data } = await supabase.rpc("my_stores");
  const shops = (data ?? []) as Row[];

  return (
    <main className="min-h-screen px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center gap-3">
          <Store className="h-6 w-6 text-ocean-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">My shops</h1>
        </div>
        <p className="mb-8 text-sm text-ocean-400">
          Everything here is free. Keep your details right, post what just came in, and reply to
          reviews.
        </p>

        {shops.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-800/60 px-6 py-14 text-center">
            <Store className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
            <p className="mb-1 text-ocean-200">You don&apos;t manage a shop yet.</p>
            <p className="mx-auto max-w-sm text-sm text-ocean-500">
              Find your shop in the directory and use &ldquo;Claim this store&rdquo; at the bottom of
              its page. We check it by hand, usually the same day.
            </p>
            <Link href="/stores" className="mt-4 inline-block text-sm text-emerald-400 hover:text-emerald-300">
              Find your shop →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {shops.map((s) => (
              <div key={s.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/stores/${s.slug}`} className="inline-flex items-center gap-1.5 font-display text-xl text-white hover:underline">
                      {s.name}
                      <ExternalLink className="h-4 w-4 text-ocean-500" />
                    </Link>
                    <p className="text-sm text-ocean-400">{[s.city, s.state].filter(Boolean).join(", ")}</p>
                  </div>
                  <Link
                    href={`/api/stores/${s.slug}/poster`}
                    className="rounded-xl border border-white/15 px-3 py-2 text-xs text-ocean-200 transition-colors hover:bg-white/5"
                  >
                    Print a window sign
                  </Link>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="Views, 30 days" value={s.views30} Icon={Eye} />
                  <Stat label="Following" value={s.followers} Icon={Heart} />
                  <Stat label="Reviews" value={s.reviews} Icon={MessageSquare} />
                  <Stat label="In stock" value={s.stock_count} Icon={Fish} />
                </div>

                <ShopStats storeId={s.id} />

                <details className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <summary className="cursor-pointer text-sm text-ocean-200">
                    Put a &ldquo;Find us on Underground Aquarium&rdquo; badge on your website
                  </summary>
                  <p className="mt-2 text-xs text-ocean-500">Paste this anywhere on your site:</p>
                  <code className="mt-2 block overflow-x-auto rounded-lg bg-ocean-950/70 p-3 text-[11px] text-ocean-300">
                    {`<a href="https://www.undergroundaquarium.com/stores/${s.slug}"><img src="https://www.undergroundaquarium.com/api/stores/${s.slug}/badge" alt="Find us on Underground Aquarium" width="240" height="64" /></a>`}
                  </code>
                </details>

                {s.unanswered > 0 && (
                  <Link
                    href={`/stores/${s.slug}#reviews`}
                    className="mt-4 block rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-100"
                  >
                    {s.unanswered} review{s.unanswered === 1 ? "" : "s"} without a reply. Answering one
                    is the cheapest advertising there is.
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, Icon }: { label: string; value: number; Icon: typeof Eye }) {
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
