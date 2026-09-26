"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Loader2, Star, ExternalLink } from "lucide-react";

export type LivePhoto = { id: string; url: string; is_cover: boolean };

export type QueuePhoto = {
  id: string;
  url: string;
  width: number;
  height: number;
  caption: string | null;
  created_at: string;
  species_slug: string;
  species_name: string;
  scientific_name: string | null;
  username: string | null;
  full_name: string | null;
  /** Photos already on this species' page. */
  live: LivePhoto[];
};

const MAX = 5;

const REASONS = [
  "It isn't sharp enough.",
  "It's too dark or washed out.",
  "The fish is too small in the frame.",
  "It doesn't look like this species.",
  "It needs to be your own photo of your own fish.",
  "It has a watermark, text or a filter on it.",
  "We already have a better shot of this angle.",
];

type Decision = {
  id: string;
  slug: string;
  approved: boolean;
  url: string;
  cover: boolean;
  retireId: string | null;
};

/** Use or reject member photos, one card each, oldest first. */
export default function PhotoQueue({ initial }: { initial: QueuePhoto[] }) {
  const [rows, setRows] = useState(initial);

  function done(d: Decision) {
    setRows((cur) =>
      cur
        .filter((r) => r.id !== d.id)
        .map((r) => {
          if (!d.approved || r.species_slug !== d.slug) return r;
          // Keep the other cards for this fish in step with what's now live.
          let live = r.live.filter((l) => l.id !== d.retireId);
          if (d.cover) live = live.map((l) => ({ ...l, is_cover: false }));
          live = [...live, { id: d.id, url: d.url, is_cover: d.cover }];
          return { ...r, live };
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

function Item({ row, onDone }: { row: QueuePhoto; onDone: (d: Decision) => void }) {
  const full = row.live.length >= MAX;
  const noCover = !row.live.some((l) => l.is_cover);

  const [cover, setCover] = useState(noCover);
  const [retireId, setRetireId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    if (action === "approve" && full && !retireId) {
      setError("This fish already has 5 photos. Pick the one this replaces.");
      return;
    }
    if (action === "reject" && !note.trim()) {
      setError("Pick or write a reason. The member sees it.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/species-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          action,
          cover: action === "approve" ? cover : false,
          retireId: action === "approve" && full ? retireId : null,
          note: action === "reject" ? note.trim() : null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Couldn't save that.");
      const retiredWasCover = !!row.live.find((l) => l.id === retireId)?.is_cover;
      onDone({
        id: row.id,
        slug: row.species_slug,
        approved: action === "approve",
        url: row.url,
        cover: cover || noCover || (full && retiredWasCover),
        retireId: full ? retireId : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
      setBusy(false);
    }
  }

  const who = row.full_name || row.username || "A member";
  const long = Math.max(row.width, row.height);

  return (
    <li className="overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
      <a href={row.url} target="_blank" rel="noopener noreferrer" className="block bg-ocean-950/70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.url} alt={row.species_name} className="max-h-[460px] w-full object-contain" />
      </a>

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
              · {new Date(row.created_at).toLocaleDateString()} ·{" "}
              <span className={long >= 2000 ? "text-emerald-400" : "text-ocean-400"}>
                {row.width} × {row.height}
              </span>
            </p>
            {row.caption && <p className="mt-1 text-sm text-ocean-300">&ldquo;{row.caption}&rdquo;</p>}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              full ? "bg-amber-500/15 text-amber-300" : "bg-ocean-800/70 text-ocean-300"
            }`}
          >
            {row.live.length} of {MAX} live
          </span>
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
                    className={`relative h-16 w-20 overflow-hidden rounded-lg border ${
                      picked ? "border-coral-400 ring-2 ring-coral-400/60" : "border-white/10"
                    } ${full ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.url} alt="" className={`h-full w-full object-cover ${picked ? "opacity-40" : ""}`} />
                    {l.is_cover && (
                      <span className="absolute left-1 top-1 rounded bg-black/70 p-0.5">
                        <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                      </span>
                    )}
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

        {!rejecting && (
          <label className="mb-3 flex items-center gap-2 text-sm text-ocean-300">
            <input
              type="checkbox"
              checked={cover || noCover}
              disabled={noCover || busy}
              onChange={(e) => setCover(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            {noCover ? "Will be the cover photo (first one for this fish)" : "Make this the cover photo"}
          </label>
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
