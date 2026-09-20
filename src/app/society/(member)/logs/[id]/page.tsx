import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeySquare, Clock, Gavel, Check, X, Flag, Download } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import {
  SPAWN_LOG_COLUMNS,
  STATUS_LABEL,
  STATUS_CLASS,
  type SpawnLog,
  type SpawnStage,
  type SpawnStageRule,
} from "@/lib/society/spawnLogs";
import { SOC_EYEBROW } from "@/lib/society/theme";
import StageTimeline from "@/components/society/StageTimeline";
import JudgePanel from "@/components/society/JudgePanel";
import AppealForm from "@/components/society/AppealForm";

export const metadata: Metadata = { title: "Spawn log" };

export const dynamic = "force-dynamic";



export default async function SpawnLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  const { data: logRow } = await supabase
    .from("spawn_logs")
    .select(SPAWN_LOG_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (!logRow) notFound();
  const log = logRow as unknown as SpawnLog;

  const [{ data: ruleRows }, { data: stageRows }] = await Promise.all([
    supabase.from("spawn_stage_rules").select("*").order("stage"),
    supabase
      .from("spawn_log_stages")
      .select("id, stage, photos, note, created_at")
      .eq("log_id", id)
      .order("stage"),
  ]);

  const rules = ((ruleRows ?? []) as unknown as SpawnStageRule[]) ?? [];
  const stages = ((stageRows ?? []) as unknown as SpawnStage[]) ?? [];
  const isOwner = log.user_id === ctx.userId;

  const [{ data: judgeFlag }, { data: speciesRow }, { data: settings }, { data: outcomeRows }] =
    await Promise.all([
      supabase.rpc("is_society_judge", { p_club_id: log.club_id, p_user_id: ctx.userId }),
      log.species_id
        ? supabase.from("club_award_species").select("points").eq("id", log.species_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("society_review_settings")
        .select("min_reason_length, appeal_days")
        .eq("club_id", log.club_id)
        .maybeSingle(),
      isOwner
        ? supabase.rpc("spawn_log_outcome", { p_log_id: id })
        : Promise.resolve({ data: [] }),
    ]);

  const isJudge = Boolean(judgeFlag) && !isOwner;
  const judgeCanRule =
    isJudge && ["awaiting_judge", "appealed", "in_review"].includes(log.status);
  const outcome = ((outcomeRows ?? []) as { vote: string; reason: string | null; voted_at: string }[]) ?? [];

  // Appealable: rejected by peers (no judge on record), once, inside the window.
  const appealDays = settings?.appeal_days ?? 30;
  const canAppeal =
    isOwner &&
    log.status === "rejected" &&
    !log.decided_by &&
    !log.appealed_at &&
    !Boolean(judgeFlag);

  return (
    <div>
      <Link
        href="/society/logs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ocean-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Spawn logs
      </Link>

      <p className={`${SOC_EYEBROW} mb-3`}>Spawn log</p>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-white sm:text-3xl">
            {log.species_name}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ocean-500">
            Opened {new Date(log.opened_at).toLocaleDateString()}
            {log.submitted_at &&
              ` · submitted ${new Date(log.submitted_at).toLocaleDateString()}`}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium ${
            STATUS_CLASS[log.status] ?? STATUS_CLASS.withdrawn
          }`}
        >
          {STATUS_LABEL[log.status]}
        </span>
      </div>

      {/* The code, given the prominence it needs — a member has to copy it
          onto a physical card twice over sixty days. */}
      {isOwner && log.status === "open" && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/30 bg-[#04060a] p-5">
          <KeySquare className="h-6 w-6 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500/70">
              Your challenge code
            </p>
            <p className="font-display text-3xl tracking-[0.2em] text-amber-300">
              {log.challenge_code}
            </p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-amber-100/55">
            Write this on a card and keep it visible in your stage 1 and stage
            5 photos. A photo that isn&apos;t yours can&apos;t have it.
          </p>
        </div>
      )}

      {log.tank_note && (
        <div className="mb-6 rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ocean-600">
            Setup notes
          </p>
          <p className="mt-1 text-sm text-ocean-300">{log.tank_note}</p>
        </div>
      )}

      {isOwner && log.status === "in_review" && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            With {log.requires_unanimous ? "peer reviewers — every one must approve" : "three peer reviewers"}.
            Reviews are blind: they don&apos;t know it&apos;s yours, and you
            won&apos;t see who they are. Each has seven days.
            {log.judge_reason && <span className="mt-1 block text-sky-300/80">{log.judge_reason}</span>}
          </span>
        </p>
      )}

      {isOwner && log.status === "awaiting_judge" && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
          <Gavel className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            With the judge.
            {log.judge_reason && <span className="block text-violet-300/80">{log.judge_reason}</span>}
          </span>
        </p>
      )}

      {isOwner && log.status === "appealed" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
          <Gavel className="h-4 w-4 shrink-0" />
          Your appeal is with the judge. Their ruling is final.
        </p>
      )}

      {(log.status === "approved" || log.status === "rejected") && isOwner && (
        <div
          className={`mb-6 rounded-2xl border p-5 ${
            log.status === "approved"
              ? "border-emerald-500/30 bg-emerald-500/[0.07]"
              : "border-coral-500/30 bg-coral-500/[0.07]"
          }`}
        >
          <p className="font-display text-lg text-white">
            {log.status === "approved"
              ? `Approved — ${log.points_awarded} points${log.is_first_in_society ? " · First in Society" : ""}`
              : "Not approved"}
          </p>
          {log.decision_note && (
            <p className="mt-1 text-sm text-ocean-300">{log.decision_note}</p>
          )}
          {log.status === "approved" && (
            <a
              href={`/api/society/certificate?kind=species&log=${log.id}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-amber-300"
            >
              <Download className="h-4 w-4" />
              Download your breeder certificate
            </a>
          )}

          {outcome.length > 0 && (
            <ul className="mt-4 space-y-2">
              {outcome.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {o.vote === "approve" ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  ) : o.vote === "deny" ? (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-coral-300" />
                  ) : (
                    <Flag className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  )}
                  <span className="text-ocean-300">
                    Reviewer {i + 1}:{" "}
                    {o.vote === "approve" ? "approved" : o.vote === "deny" ? "denied" : "sent to the judge"}
                    {o.reason && <span className="text-ocean-400"> — &ldquo;{o.reason}&rdquo;</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {canAppeal && (
            <div className="mt-5">
              <p className="mb-3 text-xs text-ocean-500">
                Think the panel got it wrong? You can appeal once, within{" "}
                {appealDays} days.
              </p>
              <AppealForm logId={log.id} minReason={settings?.min_reason_length ?? 20} />
            </div>
          )}
        </div>
      )}

      {judgeCanRule && (
        <JudgePanel
          logId={log.id}
          listPoints={(speciesRow as { points: number } | null)?.points ?? null}
          judgeReason={log.judge_reason}
          appealReason={log.status === "appealed" ? log.appeal_reason : null}
        />
      )}

      {isOwner ? (
        <StageTimeline
          logId={log.id}
          status={log.status}
          challengeCode={log.challenge_code}
          rules={rules}
          stages={stages}
          userId={ctx.userId!}
        />
      ) : (
        <ReadOnlyStages rules={rules} stages={stages} />
      )}
    </div>
  );
}

/** What a reviewer or a visitor sees on an approved log: evidence, no controls. */
function ReadOnlyStages({
  rules,
  stages,
}: {
  rules: SpawnStageRule[];
  stages: SpawnStage[];
}) {
  const byStage = new Map(stages.map((s) => [s.stage, s]));
  return (
    <ol className="space-y-3">
      {rules.map((rule) => {
        const done = byStage.get(rule.stage);
        return (
          <li
            key={rule.stage}
            className={`rounded-2xl border p-4 sm:p-5 ${
              done
                ? "border-ocean-800/60 bg-ocean-900/40"
                : "border-ocean-900/60 bg-ocean-900/20"
            }`}
          >
            <p className="text-sm font-medium text-white">
              {rule.stage}. {rule.name}
            </p>
            {done ? (
              <>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ocean-600">
                  {new Date(done.created_at).toLocaleDateString()}
                </p>
                {done.note && (
                  <p className="mt-1.5 text-sm text-ocean-300">{done.note}</p>
                )}
                {done.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {done.photos.map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt=""
                        loading="lazy"
                        className="h-24 w-24 rounded-lg border border-ocean-800/60 object-cover"
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-ocean-700">Not logged.</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
