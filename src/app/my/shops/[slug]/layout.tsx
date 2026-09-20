import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { requireOwnedStore } from "@/lib/stores/owner";
import ShopNav from "@/components/stores/ShopNav";

export default async function ShopAdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { store, supabase } = await requireOwnedStore(slug);

  // Reviews still waiting on a reply, so the menu can nag gently.
  const { data: reviewRows } = await supabase
    .from("store_reviews")
    .select("id")
    .eq("store_id", store.id);
  const ids = ((reviewRows ?? []) as { id: string }[]).map((r) => r.id);
  let unanswered = 0;
  if (ids.length > 0) {
    const { data: answered } = await supabase
      .from("review_responses")
      .select("review_id")
      .in("review_id", ids);
    unanswered = ids.length - ((answered ?? []) as { review_id: string }[]).length;
  }

  return (
    <main className="min-h-screen px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/my/shops"
          className="mb-4 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> All my shops
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ocean-800/60 pb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-emerald-400">Shop dashboard</p>
            <h1 className="font-display text-2xl text-white sm:text-3xl">{store.name}</h1>
            <p className="text-sm text-ocean-400">{[store.city, store.state].filter(Boolean).join(", ")}</p>
          </div>
          <Link
            href={`/stores/${store.slug}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-sm text-ocean-200 transition-colors hover:bg-white/5"
          >
            View public page <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
          <ShopNav slug={store.slug} unanswered={unanswered} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
