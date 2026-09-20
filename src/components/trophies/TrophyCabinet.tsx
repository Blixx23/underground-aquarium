"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Tag,
  MessagesSquare,
  Newspaper,
  Fish,
  Droplets,
  BookOpen,
  GraduationCap,
  CalendarDays,
  Store,
  Users,
  UserPlus,
  Crown,
  Egg,
  ShieldCheck,
  Lock,
  Trophy,
} from "lucide-react";
import SocietySeal from "@/components/society/SocietySeal";
import {
  CATEGORY_LABEL,
  TIER_STYLE,
  groupTrophies,
  trophyTotals,
  type TrophyRow,
  type TrophySeries,
} from "@/lib/trophies";
import { SOCIETY_PATH } from "@/lib/config";

const ICON: Record<string, typeof Tag> = {
  classifieds: Tag,
  forums: MessagesSquare,
  feed: Newspaper,
  tanks: Fish,
  water: Droplets,
  knowledge: BookOpen,
  learning: GraduationCap,
  events: CalendarDays,
  stores: Store,
  community: Users,
  referrals: UserPlus,
  society_membership: Crown,
  society_breeding: Egg,
  society_service: ShieldCheck,
};

type Filter = "all" | "earned" | "site" | "society";

/**
 * The trophy cabinet.
 *
 * Each series is one card that climbs bronze, silver, gold, platinum.
 * Your own cabinet shows how close you are to the next step. Society
 * trophies show to everyone; if you're not a member they're locked in
 * brass with a way in.
 */
export default function TrophyCabinet({
  rows,
  isSelf,
  earnedOnly = false,
  scope,
}: {
  rows: TrophyRow[];
  isSelf: boolean;
  /** A public profile: show only what's been earned. */
  earnedOnly?: boolean;
  /** Limit to site or Society trophies. */
  scope?: "site" | "society";
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const isMember = rows[0]?.is_member ?? false;

  const series = useMemo(() => {
    let s = groupTrophies(rows);
    if (scope) s = s.filter((x) => x.scope === scope);
    // A member who holds no founding bracket (joined after #1,000) never can.
    s = s.filter((x) => !(x.exclusive && isMember && !x.top));
    return s;
  }, [rows, scope, isMember]);

  const totals = trophyTotals(series);

  const shown = series.filter((s) => {
    if (earnedOnly || filter === "earned") return s.earnedCount > 0;
    if (filter === "site") return s.scope === "site";
    if (filter === "society") return s.scope === "society";
    return true;
  });

  const categories = Array.from(new Set(shown.map((s) => s.category)));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/20 to-transparent">
            <Trophy className="h-6 w-6 text-amber-300" />
          </span>
          <div>
            <p className="font-display text-2xl text-white">
              {totals.earned}
              <span className="text-ocean-500"> / {totals.total}</span>
            </p>
            <p className="text-xs text-ocean-400">trophies earned</p>
          </div>
        </div>

        {!earnedOnly && !scope && (
          <div className="flex gap-1 rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-1 text-sm">
            {(
              [
                ["all", "All"],
                ["earned", "Earned"],
                ["site", "Site"],
                ["society", "Society"],
              ] as [Filter, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  filter === k ? "bg-ocean-700/70 text-white" : "text-ocean-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-ocean-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200"
          style={{ width: `${totals.total ? (totals.earned / totals.total) * 100 : 0}%` }}
        />
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 px-6 py-12 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
          <p className="text-sm text-ocean-400">
            {isSelf ? "Nothing yet. Post an ad, share a tank or reply in the forums to earn your first." : "No trophies yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((cat) => {
            const list = shown.filter((s) => s.category === cat);
            const Icon = ICON[cat] ?? Trophy;
            const society = cat.startsWith("society");
            return (
              <section key={cat}>
                <h3
                  className={`mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] ${
                    society ? "text-amber-300/80" : "text-ocean-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {CATEGORY_LABEL[cat] ?? cat}
                  {society && !isMember && (
                    <span className="ml-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] tracking-[0.15em] text-amber-300">
                      Members only
                    </span>
                  )}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((s) => (
                    <SeriesCard key={s.id} s={s} isSelf={isSelf} isMember={isMember} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!isMember && !earnedOnly && scope !== "site" && filter !== "site" && filter !== "earned" && (
        <Link
          href={SOCIETY_PATH}
          className="mt-10 flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.12] to-transparent p-5 transition-colors hover:border-amber-400/60"
        >
          <SocietySeal size={56} className="h-14 w-14 shrink-0" />
          <span>
            <span className="block font-display text-lg text-amber-50">Unlock the Society trophies</span>
            <span className="block text-sm text-amber-100/60">
              Breeding, peer review and founding-member trophies are earned by Underground Aquarium
              Society members. Join to start collecting them.
            </span>
          </span>
        </Link>
      )}
    </div>
  );
}

function SeriesCard({ s, isSelf, isMember }: { s: TrophySeries; isSelf: boolean; isMember: boolean }) {
  const locked = s.scope === "society" && !isMember && !s.top;
  const shown: TrophyRow = s.top ?? s.steps[0];
  const style = TIER_STYLE[shown.tier];
  const earned = Boolean(s.top);
  const Icon = ICON[s.category] ?? Trophy;
  const society = s.scope === "society";

  // Founding numbers: a non-member sees the idea, not five locked brackets.
  const title = s.exclusive && !earned ? "Founding Member" : shown.name;
  const desc =
    s.exclusive && !earned
      ? "Held by the Society's earliest members, by member number."
      : earned
      ? shown.description
      : s.steps[0].description;

  const next = s.next;
  const pct =
    isSelf && next && next.threshold && next.progress !== null
      ? Math.min(100, (Number(next.progress) / next.threshold) * 100)
      : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 ${
        earned
          ? `${style.ring} bg-gradient-to-br ${style.bg} to-ocean-950/60`
          : locked
          ? "border-amber-500/20 bg-[#0b0905]"
          : "border-ocean-800/60 bg-ocean-900/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            earned ? `${style.ring} bg-black/30` : "border-ocean-800/70 bg-ocean-950/60"
          }`}
        >
          {locked ? (
            <Lock className="h-5 w-5 text-amber-500/60" />
          ) : (
            <Icon className={`h-5 w-5 ${earned ? style.text : "text-ocean-700"}`} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] font-semibold ${earned ? "text-white" : "text-ocean-300"}`}>
            {title}
          </p>
          <p className={`text-xs ${earned ? style.text : "text-ocean-600"}`}>
            {earned ? style.label : locked ? "Society members only" : "Not yet earned"}
            {earned && shown.earned_at && (
              <span className="text-ocean-500">
                {" · "}
                {new Date(shown.earned_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </p>
        </div>
        {society && <SocietySeal size={18} className={`h-[18px] w-[18px] shrink-0 ${earned ? "" : "opacity-40"}`} />}
      </div>

      <p className="mt-3 text-sm leading-snug text-ocean-400">{desc}</p>
      {shown.detail && earned && <p className="mt-1 text-xs italic text-ocean-500">{shown.detail}</p>}

      {/* Tier pips for a series */}
      {s.steps.length > 1 && !s.exclusive && (
        <div className="mt-3 flex items-center gap-1.5">
          {s.steps.map((step) => (
            <span
              key={step.key}
              title={`${step.name}: ${step.description}`}
              className={`h-2 flex-1 rounded-full ${
                step.earned_at
                  ? step.tier === "platinum"
                    ? "bg-cyan-200"
                    : step.tier === "gold"
                    ? "bg-amber-300"
                    : step.tier === "silver"
                    ? "bg-slate-300"
                    : "bg-orange-500"
                  : "bg-ocean-800/80"
              }`}
            />
          ))}
        </div>
      )}

      {next && !locked && isSelf && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-ocean-500">
              {/* An unearned card is already titled with its first step, so don't repeat it. */}
              {earned || next.name !== title ? (
                <>
                  Next: <span className="text-ocean-300">{next.name}</span>
                </>
              ) : pct !== null ? (
                "Progress"
              ) : null}
            </span>
            {pct !== null && next.threshold && (
              <span className="shrink-0 font-mono text-ocean-400">
                {Math.min(Number(next.progress), next.threshold).toLocaleString()}/{next.threshold.toLocaleString()}
              </span>
            )}
          </div>
          {pct !== null && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ocean-900">
              <div className="h-full rounded-full bg-ocean-400" style={{ width: `${pct}%` }} />
            </div>
          )}
          {!earned && isSelf && next.description !== desc && (
            <p className="mt-1 text-xs text-ocean-600">{next.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
