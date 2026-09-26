"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, X, Loader2, ExternalLink, ImageIcon } from "lucide-react";
import { clock, MAX_VIDEOS_PER_SPECIES, STAGE_LABEL, VIDEO_STAGES, type VideoStage } from "@/lib/video/stages";

export type LiveVideo = { id: string; poster_url: string | null; stage: string };

export type QueueVideo = {
  id: string;
  stage: string;
  caption: string | null;
  video_url: string;
  poster_url: string | null;
  duration_s: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  species_slug: string;
  species_name: string;
  scientific_name: string | null;
  username: string | null;
  full_name: string | null;
  live: LiveVideo[];
};

const REASONS = [
  "It's too shaky to follow.",
  "The fish are too small or out of focus.",
  "It doesn't show courtship, spawning, eggs or fry.",
  "It doesn't look like this species.",
  "It needs to be your own tank, filmed by you.",
  "It has music, text, a watermark or a filter.",
  "We already have a clearer video of this.",
];

type Decision = { id: string; slug: string; approved: boolean; poster: string | null; stage: string; retireId: string | null };

/** Use or reject member breeding videos, oldest first. */
export default function VideoQueue({ initial }: { initial: QueueVideo[] }) {
  const [rows, setRows] = useState(initial);

  function done(d: Decision) {
    setRows((cur) =>
      cur
        .filter((r) => r.id !== d.id)
        .map((r) => {
          if (!d.approved || r.species_slug !== d.slug) return r;
          const live = r.live.filter((l) => l.id !== d.retireId);
          return { ...r, live: [...live, { id: d.id, poster_url: d.poster, stage: d.stage }] };
        })
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ocean-800/60 py-12 text-center text-sm text-ocean-400">
        Nothing waiting.
      </p>
    );
  }

  return (
    <ul className="space-y-5">
      {rows.map((r) => (
        <Item key={r.id} row={r} onDone={done} />
      ))}
    </ul>
  );
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/species-videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; poster_url?: string };
  if (!res.ok) throw new Error(json.error || "Couldn't save that.");
  return json;
}

function Item({ row, onDone }: { row: QueueVideo; onDone: (d: Decision) => void }) {
  const full = row.live.length >= MAX_VIDEOS_PER_SPECIES;
  const [stage, setStage] = useState(row.stage);
  const [poster, setPoster] = useState(row.poster_url);
  const [retireId, setRetireId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const player = useRef<HTMLVideoElement>(null);

  async function grabFrame() {
    const at = player.current?.currentTime ?? 0;
    setPosterBusy(true);
    setError(null);
    try {
      const j = await post({ id: row.id, action: "poster", at });
      if (j.poster_url) {
        setPoster(j.poster_url);
        if (player.current) player.current.poster = j.poster_url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't make that poster.");
    } finally {
      setPosterBusy(false);
    }
  }

  async function decide(action: "approve" | "reject") {
    if (action === "approve" && full && !retireId) {
      setError(`This fish already has ${MAX_VIDEOS_PER_SPECIES} videos. Pick the one this replaces.`);
      return;
    }
    if (action === "reject" && !note.trim()) {
      setError("Pick or write a reason. The member sees it.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post({
        id: row.id,
        action,
        stage,
        retireId: action === "approve" && full ? retireId : null,
        note: action === "reject" ? note.trim() : null,
      });
      onDone({ id: row.id, slug: row.species_slug, approved: action === "approve", poster, stage, retireId: full ? retireId : null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
      setBusy(false);
    }
  }

  const who = row.full_name || row.username || "A member";
  const portrait = (row.height ?? 0) > (row.width ?? 0);
  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs transition-colors ${
      on ? "border-sky-400/60 bg-sky-500/15 text-white" : "border-white/10 text-ocean-300 hover:text-white"
    }`;

  return (
    <li className="overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
      <div className={`bg-black ${portrait ? "flex justify-center" : ""}`}>
        <video
          ref={player}
          src={row.video_url}
          poster={poster ?? undefined}
          controls
          playsInline
          preload="metadata"
          className={portrait ? "max-h-[520px] w-auto" : "block w-full"}
        />
      </div>

      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/species/${row.species_slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 font-medium text-white hover:text-emerald-300"
            >
              {row.species_name} <ExternalLink className="h-3.5 w-3.5 text-ocean-500" />
            </Link>
            {row.scientific_name && <p className="text-sm italic text-ocean-400">{row.scientific_name}</p>}
            <p className="mt-1 text-xs text-ocean-500">
              From{" "}
              {row.username ? (
                <Link href={`/u/${row.username}`} target="_blank" className="text-ocean-300 hover:text-white">
                  {who}
                </Link>
              ) : (
                who
              )}{" "}
              · {new Date(row.created_at).toLocaleDateString()} · {clock(row.duration_s)} · {row.width} × {row.height}
            </p>
            {row.caption && <p className="mt-1 text-sm text-ocean-300">&ldquo;{row.caption}&rdquo;</p>}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              full ? "bg-amber-500/15 text-amber-300" : "bg-ocean-800/70 text-ocean-300"
            }`}
          >
            {row.live.length} of {MAX_VIDEOS_PER_SPECIES} live
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ocean-400">Shows:</span>
          {VIDEO_STAGES.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => setStage(s)} className={chip(stage === s)}>
              {STAGE_LABEL[s as VideoStage]}
            </button>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="Poster" className="h-12 w-20 rounded-md border border-white/10 object-cover" />
          )}
          <button
            type="button"
            onClick={grabFrame}
            disabled={posterBusy || busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-ocean-200 hover:text-white disabled:opacity-50"
          >
            {posterBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            Use the paused frame as the poster
          </button>
        </div>

        {row.live.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs text-ocean-400">
              {full ? "Already live. Tap the one this replaces:" : "Already live on the page:"}
            </p>
            <div className="flex flex-wrap gap-2">
              {row.live.map((l) => {
                const picked = retireId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={!full || busy}
                    onClick={() => setRetireId(picked ? null : l.id)}
                    className={`relative h-14 w-24 overflow-hidden rounded-lg border ${
                      picked ? "border-coral-400 ring-2 ring-coral-400/60" : "border-white/10"
                    } ${full ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {l.poster_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.poster_url} alt="" className={`h-full w-full object-cover ${picked ? "opacity-40" : ""}`} />
                    )}
                    <span className="absolute bottom-0.5 left-1 rounded bg-black/70 px-1 text-[10px] text-white">
                      {STAGE_LABEL[l.stage as VideoStage] ?? l.stage}
                    </span>
                    {picked && (
                      <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-coral-200">
                        Replace
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {rejecting && (
          <div className="mb-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNote(r)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    note === r
                      ? "border-coral-400/60 bg-coral-500/15 text-coral-200"
                      : "border-white/10 text-ocean-300 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Reason the member will see"
              className="w-full rounded-lg border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:border-ocean-500 focus:outline-none"
            />
          </div>
        )}

        {error && <p className="mb-3 text-sm text-coral-300">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {!rejecting ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide("approve")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {full ? "Use it (replace selected)" : "Use it"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setRejecting(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-ocean-300 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Reject
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide("reject")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-coral-400/40 bg-coral-500/15 px-4 py-2 text-sm font-semibold text-coral-200 hover:bg-coral-500/25 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject with this reason
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setRejecting(false);
                }}
                className="rounded-lg px-4 py-2 text-sm text-ocean-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
