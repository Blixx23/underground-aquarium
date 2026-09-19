import Link from "next/link";
import { ShieldCheck, Clock, Check, ArrowRight } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { SOC_EYEBROW } from "@/lib/society/theme";

export const dynamic = "force-dynamic";

type QueueRow = {
  review_id: string;
  log_id: string;
  species_name: string;
  points: number | null;
  challenge_code: string;
  assigned_at: string;
  due_at: string;
  status: "pending" | "voted";
  vote: string | null;
};

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const sp = await searchParams;
  await getSocietyContext();
  const supabase = await createClient();

  // Lazy deadline sweep: anything overdue anywhere gets reassigned now, so
  // no entry sits stuck behind a reviewer who went quiet.
  await supabase.rpc("expire_overdue_reviews");

  const { data } = await supabase.rpc("my_review_queue");
  const rows = ((data ?? []) as QueueRow[]) ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status === "voted");

  const daysLeft = (iso: string) =>
    Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Service</p>
      <h1 className="mb-2 font-display text-2xl text-white sm:text-3xl">
        Review queue
      </h1>
      <p className="mb-8 max-w-xl text-sm text-ocean-400">
        Entries assigned to you at random. Reviews are blind in both
        directions, and each one you complete counts toward your Reviewer
        badges and raffle entries.
      </p>

      {sp.done && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Check className="h-4 w-4 shrink-0" />
          Vote recorded. Thank you — this is what keeps the titles worth
          having.
        </p>
      )}

      {pending.length === 0 ? (
        <div className="mb-10 rounded-2xl border border-dashed border-ocean-800/60 py-14 text-center">
          <ShieldCheck className="mx-auto mb-4 h-9 w-9 text-ocean-700" />
          <p className="mb-1 text-lg text-ocean-200">Nothing waiting on you</p>
          <p className="mx-auto max-w-sm text-sm text-ocean-500">
            When an entry is assigned to you it appears here, with seven days
            to review it.
          </p>
        </div>
      ) : (
        <ul className="mb-10 space-y-2">
          {pending.map((r) => {
            const left = daysLeft(r.due_at);
            return (
              <li key={r.review_id}>
                <Link
                  href={`/society/review/${r.review_id}`}
                  className="group flex flex-wrap items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] px-4 py-3 transition-colors hover:border-amber-400/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {r.species_name}
                    </span>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-ocean-500">
                      Code {r.challenge_code}
                      {r.points ? ` · ${r.points} pts` : " · unclassified"}
                    </span>
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider ${
                      left <= 1 ? "text-coral-300" : "text-amber-300"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {left === 0 ? "due today" : `${left}d left`}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-500/60 transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-lg text-white">
            You&apos;ve reviewed
          </h2>
          <ul className="space-y-2">
            {done.map((r) => (
              <li
                key={r.review_id}
                className="flex items-center gap-4 rounded-xl border border-ocean-800/60 bg-ocean-900/30 px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-ocean-300">
                  {r.species_name}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ocean-500">
                  {r.vote === "approve" ? "Approved" : r.vote === "deny" ? "Denied" : "Sent to judge"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
