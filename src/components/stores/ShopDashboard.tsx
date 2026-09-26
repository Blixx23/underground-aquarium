"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Check,
  Clock,
  Globe,
  Heart,
  Loader2,
  MapPin,
  BarChart3,
  MessageSquare,
  Minus,
  Navigation,
  Newspaper,
  Phone,
  Star,
  Trophy,
  Eye,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DayRow = { day: string; views: number; directions: number; calls: number; website: number };
export type Fix = { id: string; kind: string; body: string; created_at: string };
export type Dashboard = {
  daily: DayRow[];
  followers: number;
  followers_7: number;
  followers_30: number;
  reviews: number;
  reviews_7: number;
  reviews_30: number;
  rating: number | null;
  unanswered: number;
  city: string | null;
  city_shops: number;
  rank_7: number;
  rank_30: number;
  photos: number;
  posts: number;
  days_since_post: number | null;
  has_hours: boolean;
  has_about: boolean;
  has_phone: boolean;
  has_website: boolean;
  fixes: Fix[];
};

type Metric = "views" | "directions" | "calls" | "website";
type Period = 7 | 30;

const METRICS: { key: Metric; label: string; unit: string; Icon: typeof Eye; hint: string }[] = [
  { key: "views", label: "Page views", unit: "views", Icon: Eye, hint: "Times people opened your shop's page" },
  { key: "directions", label: "Directions", unit: "direction taps", Icon: Navigation, hint: "Taps on Get directions" },
  { key: "calls", label: "Calls", unit: "calls", Icon: Phone, hint: "Taps on your phone number" },
  { key: "website", label: "Website visits", unit: "website visits", Icon: Globe, hint: "Taps through to your website" },
];

const FIX_LABEL: Record<string, string> = {
  hours: "Hours are wrong",
  closed: "Closed for good",
  moved: "Moved to a new address",
  phone: "Phone number is wrong",
  website: "Website is wrong",
  name: "Name is wrong",
  other: "Something else",
};

const sum = (rows: DayRow[], k: Metric) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);

function dayLabel(iso: string, style: "short" | "weekday" | "long") {
  const d = new Date(`${iso}T12:00:00`);
  if (style === "weekday") return d.toLocaleDateString("en-US", { weekday: "short" });
  if (style === "long") return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Up or down against the period before, with an arrow and words, never colour alone. */
function Trend({ now, before, period }: { now: number; before: number; period: Period }) {
  const vs = `vs the ${period} days before`;
  if (before === 0 && now === 0) return <span className="text-xs text-ocean-500">No change</span>;
  if (before === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-300">
        <ArrowUpRight className="h-3.5 w-3.5" /> New {vs}
      </span>
    );
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-ocean-400">
        <Minus className="h-3.5 w-3.5" /> Same {vs}
      </span>
    );
  return pct > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-xs text-emerald-300">
      <ArrowUpRight className="h-3.5 w-3.5" /> {pct}% {vs}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-xs text-coral-300">
      <ArrowDownRight className="h-3.5 w-3.5" /> {Math.abs(pct)}% {vs}
    </span>
  );
}

/** A tiny trend line for a stat card. Decorative; the number carries the meaning. */
function Spark({ values, on }: { values: number[]; on: boolean }) {
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 24;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-6 w-full" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={on ? "#38bdf8" : "#3b6a8c"}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Daily bars for one measure, with dates, a scale, and tap or hover to read a day. */
function DailyChart({ rows, metric, period }: { rows: DayRow[]; metric: (typeof METRICS)[number]; period: Period }) {
  const [pick, setPick] = useState<number | null>(null);
  const values = rows.map((r) => r[metric.key]);
  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values, 0);
  // A clean top for the scale: 1, 2, 5, 10, 20, 50...
  const top = max <= 0 ? 1 : [1, 2, 5].map((m) => m * 10 ** Math.floor(Math.log10(max))).concat(10 ** Math.ceil(Math.log10(max + 1))).find((t) => t >= max)!;
  const shown = pick ?? values.length - 1;
  const labelEvery = period === 7 ? 1 : 7;

  if (total === 0) {
    return (
      <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 text-center">
        <metric.Icon className="mb-2 h-6 w-6 text-ocean-600" />
        <p className="text-sm text-ocean-300">No {metric.unit} in the last {period} days yet.</p>
        <p className="mt-1 text-xs text-ocean-500">
          Share your page link or put the QR sign in your window. Every visit shows up here the same day.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 min-h-[1.25rem] text-sm text-ocean-300" aria-live="polite">
        <span className="font-semibold text-white">{values[shown].toLocaleString()}</span> {metric.unit} on{" "}
        {dayLabel(rows[shown].day, "long")}
        {pick === null && <span className="text-ocean-500"> (most recent day · tap a bar for another)</span>}
      </p>
      <div className="relative h-44 pl-8">
        {/* Scale: top and zero, with a faint midline. */}
        <span className="absolute left-0 top-0 w-7 text-right font-mono text-[10px] text-ocean-500">{top}</span>
        {top >= 2 && (
          <span className="absolute left-0 top-1/2 w-7 -translate-y-1/2 text-right font-mono text-[10px] text-ocean-600">
            {top / 2}
          </span>
        )}
        <span className="absolute bottom-0 left-0 w-7 text-right font-mono text-[10px] text-ocean-500">0</span>
        <div className="pointer-events-none absolute inset-x-8 top-0 border-t border-white/[0.06]" />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 border-t border-dashed border-white/[0.06]" />
        <div className="absolute inset-x-8 bottom-0 border-t border-white/15" />
        <div className="flex h-full items-end" style={{ gap: period === 7 ? 8 : 2 }}>
          {values.map((v, i) => (
            <button
              key={rows[i].day}
              type="button"
              onClick={() => setPick(i)}
              onMouseEnter={() => setPick(i)}
              aria-label={`${dayLabel(rows[i].day, "long")}: ${v} ${metric.unit}`}
              className="group flex h-full flex-1 items-end focus:outline-none"
            >
              <span
                className={`w-full rounded-t-[4px] transition-colors ${
                  i === shown ? "bg-sky-300" : "bg-sky-500/70 group-hover:bg-sky-400"
                }`}
                style={{ height: v > 0 ? `${Math.max(3, (v / top) * 100)}%` : "2px", opacity: v > 0 ? 1 : 0.35 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex pl-8" style={{ gap: period === 7 ? 8 : 2 }}>
        {rows.map((r, i) => (
          <span
            key={r.day}
            className={`flex-1 overflow-visible whitespace-nowrap font-mono text-[10px] text-ocean-500 ${
              period === 30 && i === rows.length - 1 ? "text-right" : "text-center"
            }`}
          >
            {period === 7 || (rows.length - 1 - i) % labelEvery === 0
              ? dayLabel(r.day, period === 7 ? "weekday" : "short")
              : ""}
          </span>
        ))}
      </div>
      {/* The same numbers as a table, for screen readers. */}
      <table className="sr-only">
        <caption>
          {metric.label} per day, last {period} days
        </caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              <th scope="row">{r.day}</th>
              <td>{r[metric.key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FixItem({ fix, onDone }: { fix: Fix; onDone: (id: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function resolve(status: "done" | "dismissed") {
    setBusy(status);
    setError(null);
    const { error: err } = await createClient().rpc("resolve_my_store_fix", { p_id: fix.id, p_status: status });
    setBusy(null);
    if (err) setError(err.message);
    else onDone(fix.id);
  }
  return (
    <li className="rounded-xl border border-coral-400/25 bg-coral-500/[0.06] p-3">
      <p className="text-sm font-medium text-white">
        A shopper says: {FIX_LABEL[fix.kind] ?? "Something is wrong"}
        <span className="ml-2 text-xs font-normal text-ocean-500">{dayLabel(fix.created_at.slice(0, 10), "short")}</span>
      </p>
      {fix.body && <p className="mt-1 text-sm text-ocean-300">&ldquo;{fix.body}&rdquo;</p>}
      {error && <p className="mt-1 text-xs text-coral-300">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => resolve("done")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy === "done" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          I&apos;ve fixed it
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => resolve("dismissed")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-ocean-300 hover:text-white disabled:opacity-50"
        >
          {busy === "dismissed" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          It&apos;s already right
        </button>
      </div>
    </li>
  );
}

function useNumbers(data: Dashboard, period: Period) {
  const daily = data.daily ?? [];
  const cur = daily.slice(-period);
  const prev = daily.slice(-period * 2, -period);
  return { cur, prev };
}

const heading = (rows: DayRow[]) => sum(rows, "directions") + sum(rows, "calls") + sum(rows, "website");

function PeriodToggle({ period, setPeriod, title }: { period: Period; setPeriod: (p: Period) => void; title: string }) {
  const btn = (p: Period) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      period === p ? "bg-sky-500/20 text-white ring-1 ring-sky-400/40" : "text-ocean-400 hover:text-white"
    }`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-xl text-white">{title}</h2>
      <div role="group" aria-label="Time period" className="flex gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
        <button type="button" onClick={() => setPeriod(7)} className={btn(7)} aria-pressed={period === 7}>
          7 days
        </button>
        <button type="button" onClick={() => setPeriod(30)} className={btn(30)} aria-pressed={period === 30}>
          30 days
        </button>
      </div>
    </div>
  );
}

/**
 * Overview: what needs doing, how many people are heading the shop's
 * way, and how the shop stands. The full numbers live on Insights.
 */
export function ShopOverview({ data, slug }: { data: Dashboard; slug: string }) {
  const [period, setPeriod] = useState<Period>(7);
  const [fixes, setFixes] = useState<Fix[]>(data.fixes ?? []);
  const { cur, prev } = useNumbers(data, period);
  const headNow = heading(cur);
  const headBefore = heading(prev);
  const viewsNow = sum(cur, "views");
  const rank = period === 7 ? data.rank_7 : data.rank_30;
  const newFollowers = period === 7 ? data.followers_7 : data.followers_30;
  const newReviews = period === 7 ? data.reviews_7 : data.reviews_30;

  const base = `/my/shops/${slug}`;
  const todo: { Icon: typeof Eye; text: string; href: string; tone: "urgent" | "normal" }[] = [];
  if (data.unanswered > 0)
    todo.push({
      Icon: MessageSquare,
      text: `${data.unanswered} review${data.unanswered === 1 ? " is" : "s are"} waiting for your reply`,
      href: `${base}/reviews`,
      tone: "urgent",
    });
  if (!data.has_hours) todo.push({ Icon: Clock, text: "Set your opening hours", href: `${base}/hours`, tone: "urgent" });
  if (!data.has_phone) todo.push({ Icon: Phone, text: "Add your phone number so people can call", href: `${base}/hours`, tone: "normal" });
  if (data.photos === 0) todo.push({ Icon: Camera, text: "Add a few photos of your tanks and storefront", href: `${base}/photos`, tone: "normal" });
  if (data.days_since_post == null || data.days_since_post > 14)
    todo.push({
      Icon: Newspaper,
      text: data.posts === 0 ? "Post your first update: a restock, a sale, an event" : `Your last update was ${data.days_since_post} days ago. Post what just came in`,
      href: `${base}/updates`,
      tone: "normal",
    });
  if (!data.has_about) todo.push({ Icon: Star, text: "Write a short description of the shop", href: `${base}/hours`, tone: "normal" });
  if (!data.has_website) todo.push({ Icon: Globe, text: "Add your website, if you have one", href: `${base}/hours`, tone: "normal" });

  return (
    <div className="space-y-6">
      {fixes.length > 0 || todo.length > 0 ? (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-white">
            <AlertTriangle className="h-5 w-5 text-amber-300" /> Needs your attention
          </h2>
          {fixes.length > 0 && (
            <ul className="mb-3 space-y-2">
              {fixes.map((f) => (
                <FixItem key={f.id} fix={f} onDone={(id) => setFixes((c) => c.filter((x) => x.id !== id))} />
              ))}
            </ul>
          )}
          {todo.length > 0 && (
            <ul className="space-y-1.5">
              {todo.map((t) => (
                <li key={t.text}>
                  <Link href={t.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-white/5">
                    <t.Icon className={`h-4 w-4 shrink-0 ${t.tone === "urgent" ? "text-amber-300" : "text-ocean-400"}`} />
                    <span className={t.tone === "urgent" ? "text-white" : "text-ocean-200"}>{t.text}</span>
                    <span className="ml-auto text-ocean-500">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200">
          <Check className="h-4 w-4" /> All caught up. Your page is complete and every review has a reply.
        </p>
      )}

      <PeriodToggle period={period} setPeriod={setPeriod} title="How people found you" />

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/[0.12] to-transparent p-5">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-sky-200/80">
            <MapPin className="h-3.5 w-3.5" /> People heading your way
          </p>
          <p className="mt-1 font-display text-4xl text-white">{headNow.toLocaleString()}</p>
          <Trend now={headNow} before={headBefore} period={period} />
          <p className="mt-2 text-xs text-ocean-400">
            {sum(cur, "directions")} asked for directions, {sum(cur, "calls")} called, {sum(cur, "website")} visited your
            website
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ocean-400">
            <Eye className="h-3.5 w-3.5" /> Looked you up
          </p>
          <p className="mt-1 font-display text-4xl text-white">{viewsNow.toLocaleString()}</p>
          <Trend now={viewsNow} before={sum(prev, "views")} period={period} />
          <p className="mt-2 text-xs text-ocean-400">
            {viewsNow > 0 && headNow > 0
              ? `About 1 in ${Math.max(1, Math.round(viewsNow / headNow))} of them took a step toward visiting.`
              : "Page views on Underground Aquarium in this period."}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={`${base}/reviews`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-400">
            <Star className="h-3.5 w-3.5" /> Rating
          </p>
          {data.reviews > 0 ? (
            <>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-display text-2xl text-white">{data.rating ?? "–"}</span>
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
              </p>
              <p className="text-xs text-ocean-400">
                {data.reviews} review{data.reviews === 1 ? "" : "s"}
                {newReviews > 0 ? ` · +${newReviews} new` : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ocean-300">No reviews yet. Ask a regular to leave one.</p>
          )}
        </Link>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-400">
            <Heart className="h-3.5 w-3.5" /> Followers
          </p>
          <p className="mt-0.5 font-display text-2xl text-white">{data.followers.toLocaleString()}</p>
          <p className="text-xs text-ocean-400">
            {newFollowers > 0 ? `+${newFollowers} in ${period} days` : "They see every update you post"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-400">
            <Trophy className="h-3.5 w-3.5" /> In {data.city ?? "your city"}
          </p>
          {data.city && data.city_shops > 1 && viewsNow > 0 ? (
            <>
              <p className="mt-0.5 font-display text-2xl text-white">#{rank}</p>
              <p className="text-xs text-ocean-400">
                most viewed of {data.city_shops} shops, {period} days
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ocean-300">
              {data.city_shops <= 1 ? "The only shop listed here." : "Ranks once people start viewing your page."}
            </p>
          )}
        </div>
        <Link href={`${base}/updates`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-400">
            <Newspaper className="h-3.5 w-3.5" /> Updates
          </p>
          <p className="mt-0.5 font-display text-2xl text-white">{data.posts.toLocaleString()}</p>
          <p className="text-xs text-ocean-400">
            {data.days_since_post == null
              ? "None posted yet"
              : data.days_since_post === 0
                ? "Last one today"
                : `Last one ${data.days_since_post} day${data.days_since_post === 1 ? "" : "s"} ago`}
          </p>
        </Link>
      </section>

      <Link
        href={`${base}/insights`}
        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm transition-colors hover:border-sky-400/40"
      >
        <span className="flex items-center gap-2 text-white">
          <BarChart3 className="h-4 w-4 text-sky-300" /> See all your numbers, day by day
        </span>
        <span className="text-ocean-400">Insights →</span>
      </Link>
    </div>
  );
}

/** Insights: each measure as a card, and the chosen one day by day. */
export function ShopInsights({ data }: { data: Dashboard }) {
  const [period, setPeriod] = useState<Period>(30);
  const [metric, setMetric] = useState<Metric>("views");
  const { cur, prev } = useNumbers(data, period);
  const selected = METRICS.find((m) => m.key === metric)!;

  return (
    <div className="space-y-5">
      <PeriodToggle period={period} setPeriod={setPeriod} title="Insights" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Choose what the chart shows">
        {METRICS.map((m) => {
          const on = m.key === metric;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setMetric(m.key)}
              title={m.hint}
              className={`rounded-xl border p-3 text-left transition-colors ${
                on ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ocean-400">
                <m.Icon className="h-3.5 w-3.5" /> {m.label}
              </span>
              <span className="mt-0.5 block font-display text-2xl text-white">{sum(cur, m.key).toLocaleString()}</span>
              <Spark values={cur.map((r) => r[m.key])} on={on} />
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5" role="tabpanel">
        <p className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-white">
            {selected.label} per day, last {period} days
          </span>
          <Trend now={sum(cur, metric)} before={sum(prev, metric)} period={period} />
        </p>
        <DailyChart key={`${metric}-${period}`} rows={cur} metric={selected} period={period} />
      </div>
      <p className="text-xs text-ocean-500">
        Counted on your Underground Aquarium page. Your own visits aren&apos;t counted. {selected.hint}.
      </p>
    </div>
  );
}
