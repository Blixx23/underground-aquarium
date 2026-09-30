"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export const STAGES = [
  { key: "prospect", label: "Prospect" },
  { key: "contacted", label: "Contacted" },
  { key: "signed", label: "Signed" },
  { key: "not_interested", label: "Not interested" },
] as const;

async function send(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/wholesale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const r = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || r.error) throw new Error(r.error ?? "Couldn't save that.");
}

/** Stage and notes for one wholesaler. Notes save when you click away. */
export default function WholesaleRow({
  storeId,
  stage: initialStage,
  notes: initialNotes,
}: {
  storeId: string;
  stage: string | null;
  notes: string | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(initialStage ?? "prospect");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveStage(next: string) {
    const prev = stage;
    setStage(next);
    setError(null);
    try {
      await send({ storeId, action: "update", stage: next });
      router.refresh();
    } catch (e) {
      setStage(prev);
      setError(e instanceof Error ? e.message : "Couldn't save that.");
    }
  }

  async function saveNotes() {
    if (notes === savedNotes) return;
    setSaving(true);
    setError(null);
    try {
      await send({ storeId, action: "update", notes });
      setSavedNotes(notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => void saveStage(s.key)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              stage === s.key
                ? "border-violet-400/60 bg-violet-500/20 text-white"
                : "border-ocean-800/70 text-ocean-400 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void saveNotes()}
          rows={2}
          maxLength={4000}
          placeholder="Notes: who you spoke to, what they carry, minimums, terms…"
          className="block w-full resize-y rounded-lg border border-ocean-800 bg-ocean-900/60 px-3 py-2 text-base text-white placeholder:text-ocean-600 sm:text-sm"
        />
        <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-ocean-500">
          {saving ? "Saving…" : saved ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : null}
        </span>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
