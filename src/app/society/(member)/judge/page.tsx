import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gavel, ArrowRight, AlertTriangle } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { SOC_EYEBROW } from "@/lib/society/theme";

export const metadata: Metadata = { title: "Judge's desk" };

export const dynamic = "force-dynamic";

type JudgeRow = {
  log_id: string;
  species_name: string;
  points: number | null;
  status: string;
  judge_reason: string | null;
  appeal_reason: string | null;
  submitted_at: string | null;
  member_name: string;
  approvals: number;
  denials: number;
  escalations: number;
};

type AuditRow = {
  reviewer_id: string;
  member_name: string;
  reviews: number;
  approve_rate: number | null;
  accuracy: number | null;
  no_shows: number;
  flag: string | null;
};

export default async function JudgeDeskPage() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  const { data: isJudge } = await supabase.rpc("is_society_judge", {
    p_club_id: ctx.society!.id,
    p_user_id: ctx.userId,
  });
  if (!isJudge) redirect("/society/home");

  await supabase.rpc("expire_overdue_reviews");

  const [{ data: q }, { data: a }, { data: settings }, { count: pool }] = await Promise.all([
    supabase.rpc("judge_queue", { p_club_id: ctx.society!.id }),
    supabase.rpc("reviewer_audit", { p_club_id: ctx.society!.id }),
    supabase
      .from("society_review_settings")
      .select("pool_threshold")
      .eq("club_id", ctx.society!.id)
      .maybeSingle(),
    supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", ctx.society!.id)
      .eq("status", "active"),
  ]);

  const queue = ((q ?? []) as JudgeRow[]) ?? [];
  const audit = ((a ?? []) as AuditRow[]) ?? [];
  const flagged = audit.filter((r) => r.flag);
  const threshold = settings?.pool_threshold ?? 20;
  const peerOn = (pool ?? 0) >= threshold;

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Judge</p>
      <h1 className="mb-2 font-display text-2xl text-white sm:text-3xl">
        Judge&apos;s desk
      </h1>
      <p className="mb-6 max-w-xl text-sm text-ocean-400">
        Escalations, appeals, high-value records and anything peers
        couldn&apos;t settle. Your own entries never appear here — they go to
        peers and need a unanimous panel.
      </p>

      <div
        className={`mb-8 rounded-xl border px-4 py-3 text-sm ${
          peerOn
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
        }`}
      >
        {peerOn
          ? `Peer review is on — ${pool} active members. Routine entries are settled by members; only the cases below reach you.`
          : `Judge-only mode — ${pool ?? 0} of ${threshold} members. Every entry comes to you until the Society reaches ${threshold}.`}
      </div>

      <h2 className="mb-3 font-display text-lg text-white">Waiting on you</h2>
      {queue.length === 0 ? (
        <div className="mb-10 rounded-2xl border border-dashed border-ocean-800/60 py-12 text-center">
          <Gavel className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
          <p className="text-sm text-ocean-400">Nothing waiting. The desk is clear.</p>
        </div>
      ) : (
        <ul className="mb-10 space-y-2">
          {queue.map((r) => (
            <li key={r.log_id}>
              <Link
                href={`/society/logs/${r.log_id}`}
                className="group block rounded-xl border border-amber-500/30 bg-amber-500/[0.05] px-4 py-3 transition-colors hover:border-amber-400/60"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {r.species_name}
                      <span className="text-ocean-500"> · {r.member_name}</span>
                    </span>
                    <span className="block text-xs text-amber-100/60">
                      {r.status === "appealed" ? "Appeal" : r.judge_reason}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ocean-400">
                    {r.approvals}✓ {r.denials}✗ {r.escalations}⚑
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-500/60 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 font-display text-lg text-white">Reviewer audit</h2>
      {audit.length === 0 ? (
        <p className="text-sm text-ocean-500">No reviews have been cast yet.</p>
      ) : (
        <>
          {flagged.length > 0 && (
            <p className="mb-3 flex items-center gap-2 text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {flagged.length} reviewer{flagged.length === 1 ? "" : "s"} worth a look.
            </p>
          )}
          <div className="overflow-hidden rounded-2xl border border-ocean-800/60">
            {audit.map((r, i) => (
              <div
                key={r.reviewer_id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 text-sm ${
                  i % 2 ? "bg-ocean-900/30" : "bg-ocean-900/50"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-white">{r.member_name}</span>
                <span className="font-mono text-[11px] text-ocean-400">
                  {r.reviews} reviews · {Math.round((r.approve_rate ?? 0) * 100)}% approve
                  {r.accuracy !== null && ` · ${Math.round(r.accuracy * 100)}% accurate`}
                  {r.no_shows > 0 && ` · ${r.no_shows} missed`}
                </span>
                {r.flag && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] text-amber-300">
                    {r.flag}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
