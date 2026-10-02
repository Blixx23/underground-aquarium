import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Eye,
  Heart,
  Mail,
  MapPin,
  Minus,
  Star,
  Store,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TrendPanel from "./TrendPanel";
import SectionTabs from "@/components/admin/SectionTabs";

export const metadata: Metadata = { title: "Admin · Shop stats" };
export const dynamic = "force-dynamic";

type Shop = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  claimed: boolean;
  views: number;
  directions: number;
  calls: number;
  website: number;
  actions: number;
  prev_views: number;
  prev_actions: number;
  has_email?: boolean;
};

type Report = {
  days: number;
  totals: {
    views: number;
    directions: number;
    calls: number;
    website: number;
    actions: number;
    prev_views: number;
    prev_actions: number;
    shops_viewed: number;
  };
  daily: { day: string; views: number; actions: number }[];
  directory: {
    listed: number;
    claimed: number;
    claims_waiting: number;
    reviews: number;
    prev_reviews: number;
    follows: number;
    posts: number;
    fixes_open: number;
  };
  top: Shop[];
  top_actions: Shop[];
  leads: Shop[];
  risers: Shop[];
  cities: { city: string; state: string; views: number; actions: number; shops: number }[];
};

function Trend({ now, before }: { now: number; before: number }) {
  if (before === 0 && now === 0) return <span className="text-xs text-ocean-500">No change</span>;
  if (before === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-300">
        <ArrowUpRight className="h-3.5 w-3.5" /> New
      </span>
    );
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-ocean-400">
        <Minus className="h-3.5 w-3.5" /> Same
      </span>
    );
  return pct > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-xs text-emerald-300">
      <ArrowUpRight className="h-3.5 w-3.5" /> {pct}%
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-xs text-coral-300">
      <ArrowDownRight className="h-3.5 w-3.5" /> {Math.abs(pct)}%
    </span>
  );
}

function Tile({
  label,
  value,
  Icon,
  trend,
  sub,
}: {
  label: string;
  value: number;
  Icon: typeof Eye;
  trend?: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-0.5 font-display text-3xl text-white">{value.toLocaleString()}</p>
      {trend}
      {sub && <p className="mt-0.5 text-xs text-ocean-500">{sub}</p>}
    </div>
  );
}

const where = (s: { city: string | null; state: string | null }) => [s.city, s.state].filter(Boolean).join(", ");

function ShopTable({
  rows,
  empty,
  mode,
}: {
  rows: Shop[];
  empty: string;
  mode: "views" | "actions" | "leads" | "risers";
}) {
  if (!rows.length) return <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-ocean-400">{empty}</p>;
  return (
    <ol className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      {rows.map((s, i) => (
        <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <span className="w-6 shrink-0 text-right font-mono text-xs text-ocean-500">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2">
              <Link href={`/stores/${s.slug}`} className="truncate text-sm font-medium text-white hover:text-emerald-300">
                {s.name}
              </Link>
              {s.claimed ? (
                <Link
                  href={`/my/shops/${s.slug}`}
                  className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                  title="Open this shop's dashboard"
                >
                  Claimed
                </Link>
              ) : mode === "leads" ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    s.has_email ? "bg-sky-500/15 text-sky-300" : "bg-white/5 text-ocean-400"
                  }`}
                >
                  <Mail className="h-3 w-3" /> {s.has_email ? "Email on file" : "No email yet"}
                </span>
              ) : null}
            </span>
            <span className="block truncate text-xs text-ocean-500">{where(s)}</span>
          </span>
          <span className="shrink-0 text-right">
            {mode === "actions" ? (
              <>
                <span className="block font-display text-lg text-white">{s.actions.toLocaleString()}</span>
                <span className="block text-[11px] text-ocean-500">
                  {s.directions} dir · {s.calls} calls · {s.website} web
                </span>
              </>
            ) : mode === "risers" ? (
              <>
                <span className="block font-display text-lg text-emerald-300">+{(s.views - s.prev_views).toLocaleString()}</span>
                <span className="block text-[11px] text-ocean-500">
                  {s.prev_views} → {s.views} views
                </span>
              </>
            ) : (
              <>
                <span className="block font-display text-lg text-white">{s.views.toLocaleString()}</span>
                <span className="flex items-center justify-end gap-1.5 text-[11px] text-ocean-500">
                  views <Trend now={s.views} before={s.prev_views} />
                </span>
              </>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Admin wrap-up across every shop in the directory. The admin layout checks is_admin. */
export default async function AdminShopStatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: raw } = await searchParams;
  const days = raw === "30" ? 30 : raw === "90" ? 90 : 7;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_shop_report", { p_days: days });
  const r = (data ?? null) as Report | null;

  const periods = [7, 30, 90].map((d) => (
    <Link
      key={d}
      href={`/admin/shop-stats?days=${d}`}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        d === days ? "bg-sky-500/20 text-white ring-1 ring-sky-400/40" : "text-ocean-400 hover:text-white"
      }`}
    >
      {d} days
    </Link>
  ));

  return (
    <main className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-5xl">
        <SectionTabs current="/admin/shop-stats" />
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl text-white">
              <BarChart3 className="h-7 w-7 text-sky-300" /> Stats
            </h1>
            <p className="text-ocean-400">Every shop in the directory, compared with the {days} days before.</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">{periods}</div>
        </div>

        {error || !r ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-ocean-300">
            The report couldn&apos;t load. If this is the first time, run step 53&apos;s SQL in Supabase.
          </p>
        ) : (
          <div className="space-y-8">
            {/* Headline */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile
                label="Page views"
                value={r.totals.views}
                Icon={Eye}
                trend={<Trend now={r.totals.views} before={r.totals.prev_views} />}
                sub={`${r.totals.shops_viewed.toLocaleString()} shops viewed`}
              />
              <Tile
                label="Heading to shops"
                value={r.totals.actions}
                Icon={MapPin}
                trend={<Trend now={r.totals.actions} before={r.totals.prev_actions} />}
                sub={`${r.totals.directions} directions · ${r.totals.calls} calls · ${r.totals.website} web`}
              />
              <Tile
                label="New reviews"
                value={r.directory.reviews}
                Icon={Star}
                trend={<Trend now={r.directory.reviews} before={r.directory.prev_reviews} />}
              />
              <Tile label="New follows" value={r.directory.follows} Icon={Heart} sub={`${r.directory.posts} shop updates posted`} />
            </section>

            {/* Directory health */}
            <section className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-ocean-200 ring-1 ring-white/10">
                <Store className="h-4 w-4 text-ocean-400" /> {r.directory.listed.toLocaleString()} shops listed
              </span>
              <Link
                href="/admin/shops?view=claimed"
                title="See who claimed them"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-emerald-200 ring-1 ring-emerald-400/25 hover:bg-emerald-500/20"
              >
                {r.directory.claimed.toLocaleString()} claimed
                {r.directory.listed > 0 ? ` (${((r.directory.claimed / r.directory.listed) * 100).toFixed(1)}%)` : ""}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/admin/stores"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${
                  r.directory.claims_waiting > 0
                    ? "bg-amber-500/15 text-amber-200 ring-amber-400/30"
                    : "bg-white/[0.05] text-ocean-300 ring-white/10"
                }`}
              >
                {r.directory.claims_waiting} claim{r.directory.claims_waiting === 1 ? "" : "s"} waiting →
              </Link>
              <Link
                href="/admin/store-fixes"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${
                  r.directory.fixes_open > 0
                    ? "bg-coral-500/15 text-coral-200 ring-coral-400/30"
                    : "bg-white/[0.05] text-ocean-300 ring-white/10"
                }`}
              >
                <Wrench className="h-4 w-4" /> {r.directory.fixes_open} open fix report{r.directory.fixes_open === 1 ? "" : "s"} →
              </Link>
            </section>

            <TrendPanel daily={r.daily ?? []} />

            <div className="grid gap-8 lg:grid-cols-2">
              <section>
                <h2 className="mb-1 flex items-center gap-2 font-display text-xl text-white">
                  <Eye className="h-5 w-5 text-sky-300" /> Most viewed shops
                </h2>
                <p className="mb-3 text-xs text-ocean-500">Tap Claimed to open that shop&apos;s dashboard.</p>
                <ShopTable rows={r.top} mode="views" empty="No shop views in this period yet." />
              </section>
              <section>
                <h2 className="mb-1 flex items-center gap-2 font-display text-xl text-white">
                  <MapPin className="h-5 w-5 text-sky-300" /> Sending the most customers
                </h2>
                <p className="mb-3 text-xs text-ocean-500">Directions, calls and website taps: people acting on a listing.</p>
                <ShopTable rows={r.top_actions} mode="actions" empty="No directions, calls or website taps yet." />
              </section>
            </div>

            <section>
              <h2 className="mb-1 flex items-center gap-2 font-display text-xl text-white">
                <Mail className="h-5 w-5 text-amber-300" /> Warm leads: busiest unclaimed shops
              </h2>
              <p className="mb-3 text-xs text-ocean-500">
                People are already looking these shops up. The best pitch for your sign-up campaign is their own numbers.
              </p>
              <ShopTable rows={r.leads} mode="leads" empty="No unclaimed shops were viewed in this period." />
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl text-white">
                  <TrendingUp className="h-5 w-5 text-emerald-300" /> Biggest risers
                </h2>
                <ShopTable rows={r.risers} mode="risers" empty="No shop gained 3 or more views on the period before." />
              </section>
              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl text-white">
                  <Store className="h-5 w-5 text-sky-300" /> Top cities
                </h2>
                {r.cities.length ? (
                  <ol className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                    {r.cities.map((c, i) => (
                      <li key={`${c.city}-${c.state}`} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                        <span className="w-6 shrink-0 text-right font-mono text-xs text-ocean-500">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">
                            {c.city}, {c.state}
                          </span>
                          <span className="block text-xs text-ocean-500">
                            {c.shops} shop{c.shops === 1 ? "" : "s"} viewed · {c.actions} heading over
                          </span>
                        </span>
                        <span className="shrink-0 font-display text-lg text-white">{c.views.toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-ocean-400">
                    No city has views in this period yet.
                  </p>
                )}
              </section>
            </div>

            <p className="text-xs text-ocean-500">
              Counts come from shop pages on Underground Aquarium. Shop owners&apos; own visits aren&apos;t counted (from
              step 52 on).
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
