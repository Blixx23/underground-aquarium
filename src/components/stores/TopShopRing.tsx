import Link from "next/link";
import type { ReactNode } from "react";
import { Trophy } from "lucide-react";

const RING: Record<number, string> = {
  25: "from-yellow-200 via-amber-400 to-yellow-600 shadow-[0_0_28px_rgba(251,191,36,0.55)]",
  50: "from-white via-slate-300 to-slate-500 shadow-[0_0_24px_rgba(226,232,240,0.4)]",
  100: "from-orange-200 via-orange-500 to-amber-800 shadow-[0_0_24px_rgba(251,146,60,0.4)]",
};
const TAB: Record<number, string> = {
  25: "from-yellow-300 to-amber-500 text-amber-950",
  50: "from-slate-100 to-slate-400 text-slate-900",
  100: "from-orange-300 to-orange-600 text-orange-950",
};

/**
 * A Top Stores shop's logo: a gold, silver or bronze ring around it and a
 * "TOP 25" tab on top. Without a tier it just shows the logo.
 */
export default function TopShopRing({ tier, children }: { tier: 25 | 50 | 100 | null; children: ReactNode }) {
  if (!tier) return <>{children}</>;
  return (
    <div className="relative w-fit">
      <div className={`rounded-full bg-gradient-to-br p-[4px] ${RING[tier]}`}>{children}</div>
      <Link
        href="/top-stores"
        aria-label={`Top ${tier} Store. See the leaderboard`}
        className={`absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-white/40 bg-gradient-to-b px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-lg transition-transform hover:scale-105 sm:text-xs ${TAB[tier]}`}
      >
        <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Top {tier}
      </Link>
    </div>
  );
}
