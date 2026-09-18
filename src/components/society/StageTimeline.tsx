"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Lock,
  Upload,
  Loader2,
  Clock,
  KeySquare,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/images/prepareImage";
import {
  unlocksAt,
  daysUntil,
  type SpawnStage,
  type SpawnStageRule,
} from "@/lib/society/spawnLogs";
import { SOC_BTN_PRIMARY } from "@/lib/society/theme";

const MAX_PHOTOS = 4;

/**
 * The five stages of a spawn log, and the only place a member adds to one.
 *
 * Done stages show their evidence. The next stage shows an uploader, or a
 * countdown when the grow-out gap hasn't elapsed. Everything after that is
 * locked. The database enforces all of this independently — the UI just
 * avoids making someone upload four photos to be told no.
 */
export default function StageTimeline({
  logId,
  status,
  challengeCode,
  rules,
  stages,
  userId,
}: {
  logId: string;
  status: string;
  challengeCode: string;
  rules: SpawnStageRule[];
  stages: SpawnStage[];
  userId: string;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const byStage = new Map(stages.map((s) => [s.stage, s]));
  const highest = stages.reduce((m, s) => Math.max(m, s.stage), 0);
  const nextStage = highest + 1;
  const isOpen = status === "open";
  const allDone = highest >= 5;

  const prevAt = byStage.get(highest)?.created_at ?? null;
  const nextRule = rules.find((r) => r.stage === nextStage);
  const unlock = unlocksAt(prevAt, nextRule?.min_days_after_previous ?? 0);
  const waiting = daysUntil(unlock);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0 || !nextRule) return;
    setError(null);
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const raw of Array.from(files).slice(0, MAX_PHOTOS)) {
        // Handles HEIC from iPhones and downscales before upload.
        const file = await prepareImage(raw);
        const path = `${userId}/spawn/${logId}/${nextStage}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("award-photos")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("award-photos")
          .getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      const { error: rpcErr } = await supabase.rpc("add_spawn_stage", {
        p_log_id: logId,
        p_stage: nextStage,
        p_photos: urls,
        p_note: note.trim() || null,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      setNote("");
      router.refresh();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc("submit_spawn_log", {
        p_log_id: logId,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      router.refresh();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-200">
          {error}
        </p>
      )}

      <ol className="space-y-3">
        {rules.map((rule) => {
          const done = byStage.get(rule.stage);
          const isNext = isOpen && rule.stage === nextStage;
          const locked = !done && !isNext;

          return (
            <li
              key={rule.stage}
              className={`rounded-2xl border p-4 sm:p-5 ${
                done
                  ? "border-emerald-600/30 bg-emerald-500/[0.05]"
                  : isNext
                  ? "border-amber-500/40 bg-amber-500/[0.06]"
                  : "border-ocean-800/60 bg-ocean-900/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                    done
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isNext
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-ocean-800/60 text-ocean-600"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : locked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    rule.stage
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      locked ? "text-ocean-600" : "text-white"
                    }`}
                  >
                    {rule.name}
                    {rule.requires_code && (
                      <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                        <KeySquare className="h-3 w-3" />
                        code required
                      </span>
                    )}
                  </p>
                  <p
                    className={`text-sm ${
                      locked ? "text-ocean-700" : "text-ocean-400"
                    }`}
                  >
                    {rule.proves}
                  </p>

                  {done && (
                    <>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400/70">
                        Logged {new Date(done.created_at).toLocaleDateString()}
                      </p>
                      {done.note && (
                        <p className="mt-1.5 text-sm text-ocean-300">
                          {done.note}
                        </p>
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
                              className="h-20 w-20 rounded-lg border border-ocean-800/60 object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {isNext && waiting > 0 && (
                    <p className="mt-3 flex items-center gap-2 rounded-lg border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-ocean-300">
                      <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                      Unlocks in {waiting} day{waiting === 1 ? "" : "s"} — on{" "}
                      {unlock?.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      .
                    </p>
                  )}

                  {isNext && waiting === 0 && (
                    <div className="mt-4">
                      {rule.requires_code && (
                        <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/80">
                          Write{" "}
                          <span className="font-mono font-semibold text-amber-300">
                            {challengeCode}
                          </span>{" "}
                          on a card and have it visible in the photo.
                        </p>
                      )}

                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Notes for this stage (optional)"
                        className="mb-3 w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-base text-white placeholder-ocean-600 focus:border-amber-500/50 focus:outline-none sm:text-sm"
                      />

                      <label
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                          busy
                            ? "cursor-wait bg-ocean-800 text-ocean-400"
                            : "bg-amber-400 text-ocean-950 hover:bg-amber-300"
                        }`}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {busy ? "Uploading…" : `Log stage ${rule.stage}`}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={busy}
                          onChange={(e) => upload(e.target.files)}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-2 text-xs text-ocean-600">
                        Up to {MAX_PHOTOS} photos. Once logged, a stage
                        can&apos;t be replaced.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {isOpen && allDone && (
        <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] p-5 text-center">
          <p className="mb-1 font-display text-lg text-white">
            All five stages logged
          </p>
          <p className="mx-auto mb-4 max-w-md text-sm text-amber-100/65">
            Submitting sends this to other members for review. Nothing can be
            added or changed afterwards.
          </p>
          <button
            onClick={submit}
            disabled={busy}
            className={`${SOC_BTN_PRIMARY} px-8 disabled:opacity-60`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit for review
          </button>
        </div>
      )}
    </div>
  );
}

/** Supabase errors are plain objects, so instanceof Error is false for them. */
function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as { message?: string; error?: string };
    return e.message || e.error || "Something went wrong.";
  }
  return "Something went wrong.";
}
