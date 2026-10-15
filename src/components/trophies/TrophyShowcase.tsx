"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Trophy, X } from "lucide-react";
import SocietySeal from "@/components/society/SocietySeal";
import { TROPHY_ICON } from "@/components/trophies/TrophyCabinet";
import {
  CATEGORY_LABEL,
  TIER_STYLE,
  groupTrophies,
  type TrophyRow,
  type TrophySeries,
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

// Trophy descriptions are written to the owner ("your first entry"). On
// someone else's profile, read them in the third person instead.
function forViewer(text: string, isSelf: boolean) {
  if (isSelf) return text;
  return text
    .replace(/\bYour\b/g, "Their")
    .replace(/\byour\b/g, "their")
    .replace(/\bYou\b/g, "They")
    .replace(/\byou\b/g, "they");
}

function longDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
}

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
  const [open, setOpen] = useState<TrophySeries | null>(null);

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

      <p className="mb-4 text-sm text-ocean-400">
        Trophies are earned by taking part on Underground Aquarium, counted from what {isSelf ? "you've" : `${name} has`} actually
        done. Tap one to see what it&apos;s for.{" "}
        <Link href="/help/trophies" className="text-ocean-200 underline underline-offset-2 hover:text-white">
          How trophies work
        </Link>
      </p>

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
            <button
              type="button"
              key={series.id}
              onClick={() => setOpen(series)}
              aria-label={`${top.name}, ${style.label}. Show what this trophy is for`}
              className={`flex items-center gap-2.5 rounded-xl border bg-gradient-to-br p-2.5 text-left transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${style.ring} ${style.bg} to-ocean-950/60`}
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
            </button>
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

      {open && <TrophyDetail series={open} name={name} isSelf={isSelf} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** What one trophy is for, how it was earned, and the rest of its series. */
function TrophyDetail({
  series,
  name,
  isSelf,
  onClose,
}: {
  series: TrophySeries;
  name: string;
  isSelf: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const top = series.top!;
  const style = TIER_STYLE[top.tier];
  const Icon = TROPHY_ICON[series.category] ?? Trophy;
  // A founding-member style trophy has one holder per number, so only the one earned is shown.
  const ladder = series.exclusive ? [top] : series.steps;
  const who = isSelf ? "You" : name;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={top.name}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border border-ocean-800/70 bg-ocean-950 p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-2xl sm:pb-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-ocean-400 hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-gradient-to-b ${style.ring} ${style.bg} to-black/30`}>
            <Icon className={`h-6 w-6 ${style.text}`} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight text-white">{top.name}</p>
            <p className={`text-xs ${style.text}`}>
              {style.label} · {CATEGORY_LABEL[series.category] ?? series.category}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-ocean-800/60 bg-white/[0.03] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ocean-400">How it&apos;s earned</p>
          <p className="mt-1 text-sm leading-relaxed text-ocean-100">{forViewer(top.description, isSelf)}</p>
          {top.detail && <p className="mt-1 text-sm italic text-ocean-300">{top.detail}</p>}
          {top.earned_at && (
            <p className="mt-2 text-xs text-ocean-400">
              {who} earned it on {longDate(top.earned_at)}.
            </p>
          )}
          {series.scope === "society" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-200/80">
              <SocietySeal size={14} className="h-3.5 w-3.5" /> A Society trophy, earned through the Society&apos;s programs.
            </p>
          )}
        </div>

        {ladder.length > 1 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ocean-400">The full series</p>
            <ol className="mt-2 space-y-2">
              {ladder.map((step) => {
                const st = TIER_STYLE[step.tier];
                const got = !!step.earned_at;
                return (
                  <li key={step.key} className={`flex items-start gap-2.5 ${got ? "" : "opacity-60"}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TIER_DOT[step.tier]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">
                        {step.name} <span className={`text-xs ${st.text}`}>{st.label}</span>
                      </p>
                      <p className="text-xs leading-relaxed text-ocean-400">{forViewer(step.description, isSelf)}</p>
                    </div>
                    {got ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-label="Earned" />
                    ) : (
                      <span className="mt-0.5 shrink-0 text-[11px] text-ocean-500">Not yet</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {isSelf ? (
            <Link href="/trophies" className="text-emerald-300 hover:text-emerald-200">
              Open your full cabinet →
            </Link>
          ) : null}
          <Link href="/help/trophies" className="text-ocean-300 hover:text-white">
            How trophies work
          </Link>
        </div>
      </div>
    </div>
  );
}
