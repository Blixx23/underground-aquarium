import Link from "next/link";
import { Trophy } from "lucide-react";

const STYLE: Record<number, string> = {
  25: "border-amber-300/60 from-amber-400/30 to-yellow-300/15 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.35)]",
  50: "border-slate-200/50 from-slate-200/20 to-sky-200/10 text-slate-100 shadow-[0_0_12px_rgba(226,232,240,0.2)]",
  100: "border-orange-300/50 from-orange-500/20 to-amber-700/10 text-orange-200 shadow-[0_0_12px_rgba(251,146,60,0.2)]",
};

/**
 * Shown on a shop's page when it made the Top 25, 50 or 100 Stores for a
 * quarter. Gold, silver, bronze. Tapping it opens the leaderboard.
 */
export default function TopShopBadge({ tier, quarter, className = "" }: { tier: 25 | 50 | 100; quarter: string; className?: string }) {
  return (
    <Link
      href="/top-stores"
      title={`One of the Top ${tier} Stores on Underground Aquarium for ${quarter}, ranked on reviews and how often fish keepers use the page`}
      className={`inline-flex items-center gap-1.5 rounded-full border bg-gradient-to-r px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-opacity hover:opacity-90 ${STYLE[tier]} ${className}`}
    >
      <Trophy className="h-3.5 w-3.5" /> Top {tier} Store · {quarter}
    </Link>
  );
}
