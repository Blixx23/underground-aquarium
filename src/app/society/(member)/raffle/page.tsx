import Link from "next/link";
import { Ticket, Fish, ShieldCheck, RefreshCw } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { SOC_EYEBROW, SOC_CARD } from "@/lib/society/theme";

export const dynamic = "force-dynamic";

// How entries are earned. Free to enter, and it pays for the behaviour the
// Society actually wants rather than for spending money.
const EARNERS = [
  {
    Icon: Fish,
    label: "Approved submission",
    entries: "3 entries",
    desc: "Every entry that clears peer review.",
  },
  {
    Icon: ShieldCheck,
    label: "Completed review",
    entries: "1 entry",
    desc: "Each submission you review for another member.",
  },
  {
    Icon: RefreshCw,
    label: "Membership renewal",
    entries: "5 entries",
    desc: "Once per term, when your dues renew.",
  },
];

export default async function RafflePage() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  // Until the raffle tables exist, entries are derived from the activity that
  // will earn them, so the number on screen is already honest.
  const { data: subs } = await supabase
    .from("club_award_submissions")
    .select("status")
    .eq("club_id", ctx.society!.id)
    .eq("user_id", ctx.userId);

  const approved = ((subs ?? []) as { status: string }[]).filter(
    (r) => r.status === "approved"
  ).length;
  const entries = approved * 3;

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Members only</p>
      <h1 className="mb-2 font-display text-2xl text-white sm:text-3xl">
        Raffle
      </h1>
      <p className="mb-8 max-w-xl text-sm text-ocean-400">
        Free to enter. You earn entries by doing the things the Society exists
        for, and a draw runs each period. No tickets are ever sold.
      </p>

      <div className={`${SOC_CARD} mb-8 flex items-center gap-5 p-6`}>
        <Ticket className="h-10 w-10 shrink-0 text-amber-300" />
        <div>
          <p className="font-display text-3xl text-white">{entries}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500/60">
            {entries === 1 ? "entry" : "entries"} this period
          </p>
        </div>
      </div>

      <h2 className="mb-4 font-display text-xl text-white">How to earn entries</h2>
      <ul className="mb-8 space-y-2">
        {EARNERS.map(({ Icon, label, entries: n, desc }) => (
          <li
            key={label}
            className="flex items-center gap-4 rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3"
          >
            <Icon className="h-5 w-5 shrink-0 text-amber-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-white">{label}</span>
              <span className="block text-sm text-ocean-400">{desc}</span>
            </span>
            <span className="shrink-0 font-mono text-xs uppercase tracking-wider text-amber-300">
              {n}
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-ocean-800/60 bg-ocean-900/30 px-4 py-3 text-xs leading-relaxed text-ocean-500">
        Draws haven&apos;t started yet — the entry ledger and the draw itself are
        still being built. The count above reflects the entries your approved
        submissions have already earned, and they carry over.{" "}
        <Link
          href="/society/breeder"
          className="text-amber-400 transition-colors hover:text-amber-300"
        >
          Earn more
        </Link>
        .
      </div>
    </div>
  );
}
