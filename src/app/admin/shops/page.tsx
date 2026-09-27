import type { Metadata } from "next";
import Link from "next/link";
import { Search, Store, LayoutDashboard, ExternalLink } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ShopVisibilityToggle from "@/components/stores/ShopVisibilityToggle";

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
          Find any shop, open its dashboard, or show and hide it in the directory. Only admins can hide a shop.
        </p>

        <form action="/admin/shops" className="mb-4 flex gap-2">
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Shop name, city or state"
              className="w-full rounded-xl border border-ocean-700 bg-ocean-900 py-2.5 pl-9 pr-3 text-base text-white placeholder:text-ocean-500 sm:text-sm"
            />
          </div>
          <button className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 text-sm font-medium text-amber-200 hover:bg-amber-400/20">
            Search
          </button>
        </form>

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
            No shops match that.
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
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <ShopVisibilityToggle storeId={s.id} visible={s.status === "published"} />
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
