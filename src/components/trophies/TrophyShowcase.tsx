"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import SocietySeal from "@/components/society/SocietySeal";
import { TROPHY_ICON } from "@/components/trophies/TrophyCabinet";
import {
  CATEGORY_LABEL,
  TIER_STYLE,
  groupTrophies,
  type TrophyRow,
  type TrophyTier,
} from "@/lib/trophies";

const TIER_RANK: Record<TrophyTier, number> = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
const TIER_DOT: Record<TrophyTier, string> = {
  platinum: "bg-cyan-200",
  gold: "bg-amber-300",
  silver: "bg-slate-300",
  bronze: "bg-orange-500",
};

/** How many tiles show before "Show all". */
const FIRST_PAGE = 24;

/**
 * A profile's trophies, earned only.
 *
 * One compact tile per trophy series showing the highest tier reached, best
 * first. No empty slots, no "x of y" counts and no category headings, so it
 * stays tidy whether someone has 3 trophies or 300. Category chips filter
 * the grid, and long lists fold behind "Show all".
 */
export default function TrophyShowcase({ rows, name, isSelf = false }: { rows: TrophyRow[]; name: string; isSelf?: boolean }) {
  const [cat, setCat] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);

  const earned = useMemo(() => {
    return groupTrophies(rows)
      .filter((s) => s.top)
      .map((s) => ({ series: s, top: s.top! }))
      .sort(
        (a, b) =>
          TIER_RANK[b.top.tier] - TIER_RANK[a.top.tier] ||
          new Date(b.top.earned_at ?? 0).getTime() - new Date(a.top.earned_at ?? 0).getTime()
      );
  }, [rows]);

  // Every earned step counts toward the total, matching the profile header.
  const stepCount = rows.filter((r) => r.earned_at).length;
  const tierCounts = (["platinum", "gold", "silver", "bronze"] as TrophyTier[])
    .map((t) => [t, rows.filter((r) => r.earned_at && r.tier === t).length] as const)
    .filter(([, n]) => n > 0);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of earned) counts.set(e.series.category, (counts.get(e.series.category) ?? 0) + 1);
    return Array.from(counts.entries());
  }, [earned]);

  const filtered = cat === "all" ? earned : earned.filter((e) => e.series.category === cat);
  const shown = expanded ? filtered : filtered.slice(0, FIRST_PAGE);

  if (earned.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ocean-800/60 px-6 py-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
        <p className="text-sm text-ocean-400">
          {isSelf ? "No trophies yet. Post an ad, share a tank or reply in the forums to earn your first." : `${name} hasn't earned any trophies yet.`}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-b from-amber-400/20 to-transparent">
            <Trophy className="h-5 w-5 text-amber-300" />
          </span>
          <div>
            <p className="font-display text-xl leading-tight text-white">{stepCount}</p>
            <p className="text-xs text-ocean-400">trophies earned</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tierCounts.map(([t, n]) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${TIER_STYLE[t].ring} ${TIER_STYLE[t].text}`}
            >
              <span className={`h-2 w-2 rounded-full ${TIER_DOT[t]}`} />
              {n} {TIER_STYLE[t].label}
            </span>
          ))}
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {[["all", earned.length] as const, ...categories].map(([key, n]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCat(key);
                setExpanded(false);
              }}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                cat === key
                  ? "border-ocean-400 bg-ocean-800/70 text-white"
                  : "border-ocean-800/60 text-ocean-400 hover:border-ocean-600 hover:text-white"
              }`}
            >
              {key === "all" ? "All" : CATEGORY_LABEL[key] ?? key}
              <span className="ml-1 text-ocean-500">{n}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map(({ series, top }) => {
          const Icon = TROPHY_ICON[series.category] ?? Trophy;
          const style = TIER_STYLE[top.tier];
          const when = top.earned_at
            ? new Date(top.earned_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : null;
          return (
            <div
              key={series.id}
              title={`${top.name}: ${top.description}`}
              className={`flex items-center gap-2.5 rounded-xl border bg-gradient-to-br p-2.5 ${style.ring} ${style.bg} to-ocean-950/60`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-black/30 ${style.ring}`}>
                <Icon className={`h-4 w-4 ${style.text}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-white">{top.name}</p>
                <p className={`truncate text-[11px] leading-tight ${style.text}`}>
                  {style.label}
                  {when && <span className="text-ocean-500"> · {when}</span>}
                </p>
              </div>
              {series.scope === "society" && <SocietySeal size={16} className="h-4 w-4 shrink-0" />}
            </div>
          );
        })}
      </div>

      {filtered.length > FIRST_PAGE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-sm text-ocean-300 hover:text-white"
        >
          {expanded ? "Show fewer" : `Show all ${filtered.length}`}
        </button>
      )}
    </div>
  );
}
