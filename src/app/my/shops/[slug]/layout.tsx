import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { requireOwnedStore } from "@/lib/stores/owner";
import ShopNav from "@/components/stores/ShopNav";
import ShopVisibilityToggle from "@/components/stores/ShopVisibilityToggle";
import ShopTypeToggle from "@/components/stores/ShopTypeToggle";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function ShopAdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { store, supabase, user } = await requireOwnedStore(slug);

  // Admins get a switch to show or hide the shop in the directory.
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  const isAdmin = Boolean(me?.is_admin);
  let listed = true;
  let wholesale = false;
  if (isAdmin) {
    const { data: st } = await supabaseAdmin.from("fish_stores").select("status").eq("id", store.id).maybeSingle();
    const status = (st as { status?: string } | null)?.status;
    listed = status === "published";
    wholesale = status === "wholesale";
  }

  // Back link: owners with several shops go to their list; an admin looking
  // at someone else's shop goes back to the admin list; one-shop owners
  // don't need one.
  const isOwner = store.claimed_by === user.id;
  let ownedCount = 0;
  if (isOwner) {
    const { count } = await supabaseAdmin
      .from("fish_stores")
      .select("id", { count: "exact", head: true })
      .eq("claimed_by", user.id);
    ownedCount = count ?? 0;
  }
  const back =
    !isOwner && isAdmin
      ? wholesale
        ? { href: "/admin/wholesale", label: "Wholesale list (admin)" }
        : { href: "/admin/shops", label: "All shops (admin)" }
      : ownedCount > 1
        ? { href: "/my/shops?list=1", label: "All my shops" }
        : null;

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
        {back && (
          <Link
            href={back.href}
            className="mb-4 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {back.label}
          </Link>
        )}

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ocean-800/60 pb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-emerald-400">Shop dashboard</p>
            <h1 className="font-display text-2xl text-white sm:text-3xl">{store.name}</h1>
            <p className="text-sm text-ocean-400">{[store.city, store.state].filter(Boolean).join(", ")}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {isAdmin && !wholesale && <ShopVisibilityToggle storeId={store.id} visible={listed} />}
            {isAdmin && <ShopTypeToggle storeId={store.id} wholesale={wholesale} />}
            <Link
              href={`/stores/${store.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-sm text-ocean-200 transition-colors hover:bg-white/5"
            >
              View public page <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
          <ShopNav slug={store.slug} unanswered={unanswered} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
