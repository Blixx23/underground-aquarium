import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Award, Eye, MousePointerClick, Store, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import DayBars from "@/components/stats/DayBars";

export const metadata: Metadata = { title: "Admin · Shop highlights" };
export const dynamic = "force-dynamic";

/**
 * Every claimed shop, ranked by how often it was seen: the Verified Shop
 * highlights (feed, classifieds, ads, forums, Tank Builder, Water Check)
 * plus its own page views. Reads claimed shops live, so a shop shows up
 * here the moment it's claimed, with zeros until people see it.
 */

type Period = "7" | "30" | "90" | "all";
type SortKey = "seen" | "highlights" | "taps" | "views";

type Row = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  highlights: number;
  taps: number;
  views: number;
  seen: number;
  prevSeen: number;
};

const KINDS = ["featured", "featured_click", "view"] as const;
const PERIODS: { key: Period; label: string }[] = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "All time" },
];
const SORTS: { key: SortKey; label: string }[] = [
  { key: "seen", label: "Total seen" },
  { key: "highlights", label: "Highlights" },
  { key: "taps", label: "Taps" },
  { key: "views", label: "Page views" },
];

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function claimedShops() {
  const all: { id: string; slug: string; name: string; city: string | null; state: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("fish_stores")
      .select("id, slug, name, city, state")
      .not("claimed_by", "is", null)
      .eq("status", "published")
      .order("name")
      .range(from, from + 999);
    if (error || !data) break;
    all.push(...(data as typeof all));
    if (data.length < 1000) break;
  }
  return all;
}

async function events(storeIds: string[], since: string | null) {
  const rows: { store_id: string; day: string; kind: string; n: number }[] = [];
  if (storeIds.length === 0) return rows;
  // Chunk the shop list so the request URL stays short as shops grow.
  for (let i = 0; i < storeIds.length; i += 200) {
    const ids = storeIds.slice(i, i + 200);
    for (let from = 0; ; from += 1000) {
      let q = supabaseAdmin
        .from("store_events")
        .select("store_id, day, kind, n")
        .in("store_id", ids)
        .in("kind", KINDS as unknown as string[])
        .order("day")
        .range(from, from + 999);
      if (since) q = q.gte("day", since);
      const { data, error } = await q;
      if (error || !data) break;
      rows.push(...(data as typeof rows));
      if (data.length < 1000) break;
    }
  }
  return rows;
}

export default async function ShopHighlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; sort?: string }>;
}) {
  // The admin layout gates this too; check again before using the admin client.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) notFound();

  const sp = await searchParams;
  const period: Period = (["7", "30", "90", "all"] as const).includes(sp.days as Period) ? (sp.days as Period) : "7";
  const sort: SortKey = (["seen", "highlights", "taps", "views"] as const).includes(sp.sort as SortKey)
    ? (sp.sort as SortKey)
    : "seen";

  const days = period === "all" ? null : Number(period);
  const today = new Date();
  const start = days ? new Date(today.getTime() - (days - 1) * 86400000) : null;
  const prevStart = days ? new Date(today.getTime() - (2 * days - 1) * 86400000) : null;

  const shops = await claimedShops();
  const ev = await events(
    shops.map((s) => s.id),
    prevStart ? isoDay(prevStart) : null
  );

  const startIso = start ? isoDay(start) : null;
  const byShop = new Map<string, Row>(
    shops.map((s) => [s.id, { ...s, highlights: 0, taps: 0, views: 0, seen: 0, prevSeen: 0 }])
  );
  const daily = new Map<string, number>();
  for (const e of ev) {
    const r = byShop.get(e.store_id);
    if (!r) continue;
    const inPeriod = !startIso || e.day >= startIso;
    if (!inPeriod) {
      if (e.kind === "featured" || e.kind === "view") r.prevSeen += e.n;
      continue;
    }
    if (e.kind === "featured") {
      r.highlights += e.n;
      daily.set(e.day, (daily.get(e.day) ?? 0) + e.n);
    } else if (e.kind === "featured_click") r.taps += e.n;
    else if (e.kind === "view") r.views += e.n;
  }
  const rows = Array.from(byShop.values()).map((r) => ({ ...r, seen: r.highlights + r.views }));
  rows.sort((a, b) => b[sort] - a[sort] || b.seen - a.seen || a.name.localeCompare(b.name));

  const totals = rows.reduce(
    (t, r) => ({
      highlights: t.highlights + r.highlights,
      taps: t.taps + r.taps,
      views: t.views + r.views,
      seen: t.seen + r.seen,
    }),
    { highlights: 0, taps: 0, views: 0, seen: 0 }
  );
  const seenSome = rows.filter((r) => r.seen > 0).length;

  // Day-by-day highlight sightings across all shops (empty days filled in).
  const chartDays = days ?? Math.max(7, Math.min(90, daily.size));
  const points = Array.from({ length: chartDays }, (_, i) => {
    const d = isoDay(new Date(today.getTime() - (chartDays - 1 - i) * 86400000));
    return { day: d, value: daily.get(d) ?? 0 };
  });

  const link = (p: Partial<{ days: Period; sort: SortKey }>) =>
    `/admin/shop-highlights?days=${p.days ?? period}&sort=${p.sort ?? sort}`;
  const pill = (on: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm transition-colors ${
      on ? "bg-sky-500/20 text-white ring-1 ring-sky-400/40" : "text-ocean-400 hover:text-white"
    }`;

  const Stat = ({ label, value, Icon }: { label: string; value: number; Icon: typeof Eye }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ocean-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 font-display text-3xl text-white">{value.toLocaleString()}</p>
    </div>
  );

  const Trend = ({ now, before }: { now: number; before: number }) => {
    if (!days) return null;
    if (before === 0) return now > 0 ? <span className="text-[11px] text-emerald-300">New</span> : null;
    const pct = Math.round(((now - before) / before) * 100);
    if (pct === 0) return <span className="text-[11px] text-ocean-500">Same</span>;
    return pct > 0 ? (
      <span className="inline-flex items-center text-[11px] text-emerald-300">
        <ArrowUpRight className="h-3 w-3" />
        {pct}%
      </span>
    ) : (
      <span className="inline-flex items-center text-[11px] text-coral-400">
        <ArrowDownRight className="h-3 w-3" />
        {Math.abs(pct)}%
      </span>
    );
  };

  return (
    <main className="space-y-6 font-sans">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl text-white">
          <Award className="h-7 w-7 text-emerald-400" /> Shop highlights
        </h1>
        <p className="mt-1 text-ocean-400">
          Every claimed shop, ranked by how often it was seen. Highlights are the Verified Shop spots on the feed,
          classifieds, ads, forums, Tank Builder and Water Check (one per person per shop per day). New shops appear as
          soon as they&apos;re claimed.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
          {PERIODS.map((p) => (
            <Link key={p.key} href={link({ days: p.key })} className={pill(p.key === period)}>
              {p.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
          {SORTS.map((s) => (
            <Link key={s.key} href={link({ sort: s.key })} className={pill(s.key === sort)}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total seen" value={totals.seen} Icon={Eye} />
        <Stat label="Highlights" value={totals.highlights} Icon={Award} />
        <Stat label="Taps from highlights" value={totals.taps} Icon={MousePointerClick} />
        <Stat label="Shops tracked" value={rows.length} Icon={Store} />
      </div>
      <p className="-mt-3 text-xs text-ocean-500">
        {seenSome} of {rows.length} claimed shops were seen in this period.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <p className="mb-3 font-medium text-white">Highlights day by day, all shops</p>
        <DayBars points={points} unit="highlights" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem_5rem_6rem] gap-3 border-b border-white/10 px-4 py-2.5 text-[11px] uppercase tracking-wide text-ocean-500 sm:grid">
          <span className="text-right">#</span>
          <span>Shop</span>
          <span className="text-right">Total seen</span>
          <span className="text-right">Highlights</span>
          <span className="text-right">Taps</span>
          <span className="text-right">Page views</span>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-ocean-400">No claimed shops yet.</p>
        ) : (
          <ol className="divide-y divide-white/[0.06]">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem_5rem_6rem]"
              >
                <span className="text-right font-mono text-xs text-ocean-500">
                  {i < 3 && r[sort] > 0 ? (
                    <Trophy
                      className={`ml-auto h-4 w-4 ${i === 0 ? "text-amber-300" : i === 1 ? "text-slate-300" : "text-orange-400"}`}
                    />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0">
                  <Link href={`/stores/${r.slug}`} className="block truncate text-sm font-medium text-white hover:text-emerald-300">
                    {r.name}
                  </Link>
                  <span className="block truncate text-xs text-ocean-500">
                    {[r.city, r.state].filter(Boolean).join(", ")}
                    <Link href={`/my/shops/${r.slug}`} className="ml-2 text-sky-300 hover:underline">
                      Dashboard
                    </Link>
                  </span>
                  {/* On phones the numbers sit under the name. */}
                  <span className="mt-1 block text-[11px] text-ocean-400 sm:hidden">
                    {r.highlights.toLocaleString()} highlights · {r.taps.toLocaleString()} taps ·{" "}
                    {r.views.toLocaleString()} page views
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-lg text-white">{r.seen.toLocaleString()}</span>
                  <Trend now={r.seen} before={r.prevSeen} />
                </span>
                <span className="hidden text-right text-sm text-ocean-200 sm:block">{r.highlights.toLocaleString()}</span>
                <span className="hidden text-right text-sm text-ocean-200 sm:block">{r.taps.toLocaleString()}</span>
                <span className="hidden text-right text-sm text-ocean-200 sm:block">{r.views.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
