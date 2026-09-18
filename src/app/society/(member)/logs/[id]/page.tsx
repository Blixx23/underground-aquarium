import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeySquare, Clock } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import {
  SPAWN_LOG_COLUMNS,
  STATUS_LABEL,
  type SpawnLog,
  type SpawnStage,
  type SpawnStageRule,
} from "@/lib/society/spawnLogs";
import { SOC_EYEBROW } from "@/lib/society/theme";
import StageTimeline from "@/components/society/StageTimeline";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  open: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  submitted: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  rejected: "border-coral-500/40 bg-coral-500/10 text-coral-300",
  withdrawn: "border-ocean-700/60 bg-ocean-900/40 text-ocean-500",
};

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

      {log.status === "submitted" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          <Clock className="h-4 w-4 shrink-0" />
          With reviewers now. You&apos;ll be notified when there&apos;s a
          decision.
        </p>
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
