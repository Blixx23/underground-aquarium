"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Plus, Trash2, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AwardTitle } from "@/lib/awards/titles";

type Row = { title: string; min: string };

export default function TitleLadderEditor({
  clubId,
  initialTitles,
}: {
  clubId: string;
  initialTitles: AwardTitle[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>(
    (initialTitles ?? [])
      .slice()
      .sort((a, b) => b.min_points - a.min_points)
      .map((t) => ({ title: t.title, min: String(t.min_points) }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateRow(i: number, field: "title" | "min", value: string) {
    setSaved(false);
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  function addRow() {
    setSaved(false);
    setRows((prev) => [...prev, { title: "", min: "" }]);
  }

  function removeRow(i: number) {
    setSaved(false);
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError(null);
    const cleaned: AwardTitle[] = [];
    for (const r of rows) {
      const title = r.title.trim();
      const min = parseInt(r.min, 10);
      if (!title) {
        setError("Every tier needs a name.");
        return;
      }
      if (Number.isNaN(min) || min < 0) {
        setError(`Enter a valid point value for “${title}”.`);
        return;
      }
      cleaned.push({ title, min_points: min });
    }
    cleaned.sort((a, b) => b.min_points - a.min_points);

    setSaving(true);
    try {
      const { error: rpcErr } = await supabase.rpc("set_club_award_titles", {
        p_club: clubId,
        p_titles: cleaned,
      });
      if (rpcErr) throw rpcErr;
      setRows(
        cleaned.map((t) => ({ title: t.title, min: String(t.min_points) }))
      );
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save titles.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <div className="mb-1 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-300" />
        <h2 className="font-display text-lg text-white">Member titles</h2>
      </div>
      <p className="mb-4 text-sm text-ocean-400">
        Titles members earn as their total points grow. A member is given the
        highest tier their points reach.
      </p>

      {error && (
        <p className="mb-3 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {rows.length > 0 && (
          <div className="flex items-center gap-2 px-1 text-xs font-medium text-ocean-500">
            <span className="w-24">Points (min)</span>
            <span className="flex-1">Title</span>
            <span className="w-8" />
          </div>
        )}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={r.min}
              onChange={(e) => updateRow(i, "min", e.target.value)}
              placeholder="0"
              className={`${inputClass} w-24`}
            />
            <input
              value={r.title}
              onChange={(e) => updateRow(i, "title", e.target.value)}
              placeholder="Title name"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-ocean-500 transition-colors hover:text-coral-300"
              aria-label="Remove tier"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-ocean-500">
            No titles set — members won&apos;t show a rank. Add a tier below.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-200 transition-colors hover:bg-ocean-800/60"
        >
          <Plus className="h-4 w-4" /> Add tier
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ocean-600 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Save titles
        </button>
        {saved && <span className="text-sm text-emerald-300">Saved</span>}
      </div>
    </div>
  );
}
