"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VolumeX, Loader2 } from "lucide-react";

/** One press takes the sound off every breeding video already on the site. */
export default function MuteAll() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/species-videos/mute", { method: "POST" });
    const r = (await res.json().catch(() => ({}))) as { done?: number; failed?: number; left?: number; error?: string };
    setBusy(false);
    if (!res.ok || r.error) return setNote({ ok: false, text: r.error ?? "That didn't work." });
    const parts = [`${r.done ?? 0} video${r.done === 1 ? "" : "s"} now silent.`];
    if (r.failed) parts.push(`${r.failed} couldn't be done; press again to retry.`);
    if (r.left) parts.push(`${r.left} still to go; press again.`);
    if (!r.done && !r.failed && !r.left) parts.splice(0, 1, "Every video is already silent.");
    setNote({ ok: !r.failed, text: parts.join(" ") });
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2 text-sm text-ocean-200 hover:bg-white/5 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <VolumeX className="h-4 w-4" />}
        {busy ? "Removing sound…" : "Remove sound from all videos"}
      </button>
      {note && <span className={`text-sm ${note.ok ? "text-emerald-300" : "text-amber-300"}`}>{note.text}</span>}
      {!note && <span className="text-xs text-ocean-500">New uploads are silent automatically.</span>}
    </div>
  );
}
