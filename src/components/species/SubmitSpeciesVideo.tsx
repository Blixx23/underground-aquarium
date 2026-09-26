"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clapperboard, Film, Loader2, Trophy, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MAX_VIDEOS_PER_SPECIES,
  STAGE_LABEL,
  VIDEO_STAGES,
  type VideoStage,
} from "@/lib/video/stages";

type Phase = "idle" | "uploading" | "converting" | "done" | "failed";

function extFor(file: File) {
  const m = file.name.match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1].toLowerCase();
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/webm") return "webm";
  return "mp4";
}

/** How long the clip is, when this browser can read it. HEVC in Chrome often can't; the server checks anyway. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

/**
 * "Submit a breeding video" on a species page. States the bar up front,
 * uploads the original privately, then the site converts it into its
 * own web copy and it goes to the admin queue.
 */
export default function SubmitSpeciesVideo({
  speciesId,
  slug,
  name,
  approvedCount,
}: {
  speciesId: string;
  slug: string;
  name: string;
  approvedCount: number;
}) {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [waiting, setWaiting] = useState(0);
  const [open, setOpen] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [stage, setStage] = useState<VideoStage | "">("");
  const [caption, setCaption] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!live) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { count } = await supabase
        .from("species_videos")
        .select("id", { count: "exact", head: true })
        .eq("species_id", speciesId)
        .eq("user_id", uid)
        .in("status", ["processing", "pending"]);
      if (live) setWaiting(count ?? 0);
    });
    return () => {
      live = false;
      if (poll.current) clearInterval(poll.current);
    };
  }, [supabase, speciesId]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const full = approvedCount >= MAX_VIDEOS_PER_SPECIES;
  const atLimit = waiting >= 2;
  const busy = phase === "uploading" || phase === "converting";

  function reset() {
    setFile(null);
    setPreview(null);
    setSeconds(null);
    setStage("");
    setCaption("");
    setConfirm(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function pick(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    setError(null);
    if (!f.type.startsWith("video/") && !/\.(mov|mp4|m4v|webm|3gp)$/i.test(f.name)) {
      setError("That isn't a video file.");
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      setError(
        `That file is ${Math.round(f.size / 1024 / 1024)} MB. The limit is 50 MB, about 30 to 45 seconds from most phones. Trim it and try again.`
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const d = await readDuration(f);
    if (d != null && d > MAX_VIDEO_SECONDS + 1) {
      setError(`That clip is ${Math.round(d)} seconds. Trim it to ${MAX_VIDEO_SECONDS} seconds or less.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setSeconds(d);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function watch(id: string) {
    const started = Date.now();
    poll.current = setInterval(async () => {
      const { data } = await supabase.from("species_videos").select("status, error").eq("id", id).maybeSingle();
      const st = data?.status as string | undefined;
      if (st === "pending") {
        if (poll.current) clearInterval(poll.current);
        setPhase("done");
      } else if (st === "failed") {
        if (poll.current) clearInterval(poll.current);
        setPhase("failed");
        setWaiting((w) => Math.max(0, w - 1));
        setError((data?.error as string | null) ?? "We couldn't convert that video.");
      } else if (Date.now() - started > 6 * 60_000) {
        // Still going after six minutes: stop watching, the notification will say.
        if (poll.current) clearInterval(poll.current);
        setPhase("done");
      }
    }, 4000);
  }

  async function submit() {
    if (!file || !userId) return;
    if (!stage) {
      setError("Pick what the video shows.");
      return;
    }
    if (!confirm) {
      setError("Tick the box to confirm you filmed this and agree to the upload terms.");
      return;
    }
    setError(null);
    setPhase("uploading");
    const path = `${userId}/${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extFor(file)}`;
    try {
      const { error: upErr } = await supabase.storage
        .from("video-uploads")
        .upload(path, file, { contentType: file.type || "video/mp4" });
      if (upErr) throw new Error(upErr.message);

      const { data: id, error: rpcErr } = await supabase.rpc("submit_species_video", {
        p_slug: slug,
        p_raw_path: path,
        p_stage: stage,
        p_caption: caption.trim() || null,
        p_confirm: confirm,
      });
      if (rpcErr || !id) {
        await supabase.storage.from("video-uploads").remove([path]);
        throw new Error(rpcErr?.message ?? "Couldn't send that video.");
      }

      setPhase("converting");
      setWaiting((w) => w + 1);
      const res = await fetch("/api/species-videos/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Couldn't start converting that video.");
      }
      watch(id as string);
    } catch (e) {
      setPhase("failed");
      setError(e instanceof Error ? e.message : "Couldn't send that video.");
    }
  }

  if (full) {
    return (
      <p className="mb-8 text-xs text-ocean-500">
        All {MAX_VIDEOS_PER_SPECIES} breeding video spots for this fish are filled by members.
      </p>
    );
  }

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition-colors ${
      on ? "border-emerald-400/60 bg-emerald-500/15 text-white" : "border-white/10 text-ocean-300 hover:text-white"
    }`;

  return (
    <section className="mb-8 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
      {!open && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Clapperboard className="h-4 w-4 text-sky-300" />
              {approvedCount === 0 ? `Filmed your ${name} breeding? Be the first to share it` : `Submit a breeding video of your ${name}`}
            </p>
            <p className="mt-0.5 text-xs text-ocean-400">
              Courtship, spawning, eggs or fry, from your own tank. If yours is used: +75 bubbles, its own page with your
              name on it, and a trophy.
            </p>
            {waiting > 0 && phase === "idle" && (
              <p className="mt-1 text-xs text-amber-300">
                You have {waiting} video{waiting === 1 ? "" : "s"} of this fish waiting for review.
              </p>
            )}
          </div>
          {userId === null ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/species/${slug}`)}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-sky-400"
            >
              Sign in to submit
            </Link>
          ) : (
            <button
              type="button"
              disabled={userId === undefined || atLimit}
              onClick={() => {
                setPhase("idle");
                setOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-sky-400 disabled:opacity-50"
            >
              <Film className="h-4 w-4" /> {atLimit ? "2 waiting already" : "Submit a video"}
            </button>
          )}
        </div>
      )}

      {open && (
        <div>
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 font-medium text-white">
              <Clapperboard className="h-4 w-4 text-sky-300" /> Submit a breeding video of your {name}
            </p>
            {!busy && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setPhase("idle");
                  setOpen(false);
                }}
                aria-label="Close"
                className="rounded-full p-1 text-ocean-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {phase === "converting" || phase === "done" ? (
            <div className="rounded-xl border border-white/10 bg-ocean-950/40 p-4 text-sm text-ocean-200">
              {phase === "converting" ? (
                <p className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-sky-300" /> Uploaded. Converting it for the site now,
                  usually under a minute. You can leave this page; you&apos;ll get a notification.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Sent for review. You&apos;ll get a notification either way.
                </p>
              )}
              {phase === "done" && (
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setPhase("idle");
                    setOpen(false);
                  }}
                  className="mt-3 text-sm text-ocean-300 hover:text-white"
                >
                  Close
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-xl border border-white/10 bg-ocean-950/40 p-3 text-sm text-ocean-300">
                <p className="mb-2 font-medium text-white">Only clear, steady clips are used. We&apos;re looking for:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Your own fish, filmed by you, in your own tank.</li>
                  <li>Courtship, spawning, eggs or fry, with the fish in focus and the action easy to see.</li>
                  <li>Up to {MAX_VIDEO_SECONDS} seconds and 50 MB. Hold the phone steady, or rest it on the glass.</li>
                  <li>No music, text, watermarks, filters or screen recordings.</li>
                </ul>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ocean-400">
                  <Trophy className="h-3.5 w-3.5 text-amber-300" /> Up to {MAX_VIDEOS_PER_SPECIES} videos per species.
                  If yours is used you earn 75 bubbles and count toward the Videographer trophies.
                </p>
              </div>

              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ocean-400">What does it show?</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {VIDEO_STAGES.map((s) => (
                  <button key={s} type="button" disabled={busy} onClick={() => setStage(s)} className={chip(stage === s)}>
                    {STAGE_LABEL[s]}
                  </button>
                ))}
              </div>

              {preview ? (
                <div className="mb-3">
                  <video
                    src={preview}
                    controls
                    playsInline
                    muted
                    className="max-h-80 w-full rounded-xl border border-white/10 bg-black"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs text-ocean-500">
                    <span>
                      {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ""}
                      {seconds != null ? ` · ${Math.round(seconds)} seconds` : ""}
                    </span>
                    {!busy && (
                      <button type="button" onClick={() => { setFile(null); setPreview(null); setSeconds(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-ocean-300 hover:text-white">
                        Choose a different video
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ocean-500">
                    Preview blank? Some browsers can&apos;t show iPhone video before upload. It&apos;s fine; we convert it.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mb-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-10 text-sm text-ocean-300 hover:bg-white/5"
                >
                  <Film className="h-6 w-6" /> Choose a video
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="video/*,.mov,.mp4,.m4v,.webm"
                className="hidden"
                onChange={(e) => pick(e.target.files)}
              />

              <input
                value={caption}
                disabled={busy}
                onChange={(e) => setCaption(e.target.value.slice(0, 140))}
                placeholder="Caption (optional): pair laying on the slate, day one"
                className="mb-3 w-full rounded-lg border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:border-ocean-500 focus:outline-none"
              />

              <label className="mb-3 flex items-start gap-2 text-sm text-ocean-300">
                <input
                  type="checkbox"
                  checked={confirm}
                  disabled={busy}
                  onChange={(e) => setConfirm(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-sky-500"
                />
                <span>
                  I filmed this myself, in my own tank. I agree to the{" "}
                  <Link href="/terms#library-submissions" target="_blank" className="text-sky-300 underline underline-offset-2">
                    Terms
                  </Link>
                  , including that if it's used, Underground Aquarium owns it and can use it anywhere, with my name
                  credited on the site.
                </span>
              </label>

              {error && <p className="mb-3 text-sm text-coral-300">{error}</p>}

              <button
                type="button"
                onClick={submit}
                disabled={!file || busy}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-ocean-950 hover:bg-sky-400 disabled:opacity-50"
              >
                {phase === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {phase === "uploading" ? "Uploading…" : "Send for review"}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
