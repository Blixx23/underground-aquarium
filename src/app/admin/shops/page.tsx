import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Store, LayoutDashboard, ExternalLink, UserRound } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ShopVisibilityToggle from "@/components/stores/ShopVisibilityToggle";
import AdminShopSearch from "@/components/admin/AdminShopSearch";
import ShopTypeToggle from "@/components/stores/ShopTypeToggle";
import MoveToWholesale from "@/components/admin/MoveToWholesale";

export const metadata: Metadata = { title: "Admin · All shops" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  claimed_by: string | null;
};

const VIEWS = [
  { key: "all", label: "All" },
  { key: "claimed", label: "Claimed" },
  { key: "hidden", label: "Hidden" },
] as const;

/**
 * Every shop in the directory, for the admin: find one, open its
 * dashboard, or show and hide it. The admin layout already gates this
 * page to admins.
 */
export default async function AdminShopsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q: rawQ, view: rawView } = await searchParams;
  const q = String(rawQ ?? "").trim();
  const view = VIEWS.some((v) => v.key === rawView) ? (rawView as string) : "all";

  let query = supabaseAdmin
    .from("fish_stores")
    .select("id, name, slug, city, state, status, claimed_by", { count: "exact" })
    .order("name", { ascending: true })
    .limit(60);

  // Keep only characters that are safe inside the or() filter.
  const safe = q.replace(/[^\p{L}\p{N} .'&-]/gu, " ").trim();
  if (safe) query = query.or(`name.ilike.%${safe}%,city.ilike.%${safe}%,state.ilike.%${safe}%`);
  if (view === "claimed") query = query.not("claimed_by", "is", null);
  if (view === "hidden") query = query.eq("status", "hidden");
  else query = query.in("status", ["published", "hidden"]);

  const { data, count } = await query;
  const rows = (data ?? []) as Row[];

  // Who owns each claimed shop: their profile, and their sign-in email so
  // you can reach them. Admin eyes only (the admin layout gates the page).
  const ownerIds = [...new Set(rows.map((r) => r.claimed_by).filter(Boolean))] as string[];
  const owners = new Map<string, { username: string | null; name: string | null; email: string | null }>();
  if (ownerIds.length) {
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, username, full_name").in("id", ownerIds);
    for (const p of (profs ?? []) as { id: string; username: string | null; full_name: string | null }[]) {
      owners.set(p.id, { username: p.username, name: p.full_name, email: null });
    }
    await Promise.all(
      ownerIds.map(async (id) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        const o = owners.get(id) ?? { username: null, name: null, email: null };
        owners.set(id, { ...o, email: u?.user?.email ?? null });
      })
    );
  }

  const href = (v: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (v !== "all") p.set("view", v);
    const s = p.toString();
    return `/admin/shops${s ? `?${s}` : ""}`;
  };

  return (
    <main>
      <div>
        <h1 className="mb-1 flex items-center gap-3 font-display text-3xl text-white">
          <Store className="h-7 w-7 text-amber-300" /> All shops
        </h1>
        <p className="mb-6 text-sm text-ocean-400">
          Find any shop, open its dashboard, or show and hide it in the directory. Only admins can hide a shop. Switch a business to Wholesale supply to move it to the Wholesale list. Wholesale-only businesses go to the Wholesale list.
        </p>

        <Suspense fallback={<div className="mb-4 h-[46px] rounded-xl border border-ocean-700 bg-ocean-900" />}>
          <AdminShopSearch initial={q} />
        </Suspense>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={href(v.key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${
                view === v.key
                  ? "border-amber-400/60 bg-amber-500/15 text-white"
                  : "border-ocean-800/70 bg-ocean-900/40 text-ocean-300 hover:text-white"
              }`}
            >
              {v.label}
            </Link>
          ))}
          <span className="ml-auto text-xs text-ocean-500">
            {count ?? rows.length} shop{(count ?? rows.length) === 1 ? "" : "s"}
            {(count ?? 0) > rows.length ? ` · showing first ${rows.length}, search to narrow` : ""}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-ocean-800/60 bg-ocean-950/40 px-4 py-6 text-center text-sm text-ocean-400">
            {q ? (
              <>
                No shops match &ldquo;{q}&rdquo;.{" "}
                <Link href={view === "all" ? "/admin/shops" : `/admin/shops?view=${view}`} className="text-amber-200 underline hover:text-white">
                  Show all
                </Link>
              </>
            ) : (
              "No shops here yet."
            )}
          </p>
        ) : (
          <ul className="divide-y divide-ocean-800/60 overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-950/40">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{s.name}</p>
                  <p className="text-xs text-ocean-400">
                    {[s.city, s.state].filter(Boolean).join(", ") || "No location"}
                    {" · "}
                    <span className={s.claimed_by ? "text-emerald-300" : "text-ocean-500"}>
                      {s.claimed_by ? "Claimed" : "Unclaimed"}
                    </span>
                  </p>
                  {s.claimed_by && (() => {
                    const o = owners.get(s.claimed_by);
                    return (
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ocean-300">
                        <UserRound className="h-3.5 w-3.5 text-emerald-300" />
                        {o?.username ? (
                          <Link href={`/u/${o.username}`} className="text-white underline decoration-ocean-600 hover:decoration-white">
                            {o.name || `@${o.username}`}
                          </Link>
                        ) : (
                          <span className="text-white">{o?.name || "Owner"}</span>
                        )}
                        {o?.username && o.name && <span className="text-ocean-500">@{o.username}</span>}
                        {o?.email && (
                          <a href={`mailto:${o.email}`} className="text-ocean-300 hover:text-white">
                            {o.email}
                          </a>
                        )}
                      </p>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <ShopVisibilityToggle storeId={s.id} visible={s.status === "published"} />
                  <ShopTypeToggle storeId={s.id} wholesale={false} />
                  <MoveToWholesale storeId={s.id} name={s.name} />
                  {s.slug && (
                    <>
                      <Link
                        href={`/my/shops/${s.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-sm text-ocean-200 hover:bg-white/5"
                      >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                      {s.status === "published" && (
                        <Link
                          href={`/stores/${s.slug}`}
                          aria-label={`View ${s.name}`}
                          className="inline-flex items-center rounded-xl border border-white/15 px-3 py-2 text-ocean-300 hover:bg-white/5"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
