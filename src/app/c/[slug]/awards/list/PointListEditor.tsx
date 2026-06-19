"use client";

import { useMemo, useState } from "react";
import { Fish, Leaf, Plus, Trash2, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Species = {
  id: string;
  program: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  points: number;
  is_active: boolean;
};

export default function PointListEditor({
  clubId,
  initialSpecies,
}: {
  clubId: string;
  initialSpecies: Species[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [species, setSpecies] = useState<Species[]>(initialSpecies);
  const [program, setProgram] = useState<"bap" | "hap">("bap");
  const [pointDraft, setPointDraft] = useState<Record<string, string>>(
    Object.fromEntries(initialSpecies.map((s) => [s.id, String(s.points)]))
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-entry form
  const [newName, setNewName] = useState("");
  const [newSci, setNewSci] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newPoints, setNewPoints] = useState("");
  const [adding, setAdding] = useState(false);

  const list = useMemo(
    () => species.filter((s) => s.program === program),
    [species, program]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Species[]>();
    for (const s of list) {
      const key = s.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  const categories = useMemo(
    () =>
      (Array.from(
        new Set(
          species
            .filter((s) => s.program === program)
            .map((s) => s.category)
            .filter(Boolean)
        )
      ) as string[]).sort(),
    [species, program]
  );

  async function savePoints(id: string) {
    const val = parseInt(pointDraft[id] ?? "", 10);
    if (Number.isNaN(val) || val < 0) {
      setError("Enter a valid (non-negative) point value.");
      return;
    }
    setError(null);
    setBusyId(id);
    const { error: updErr } = await supabase
      .from("club_award_species")
      .update({ points: val })
      .eq("id", id);
    if (updErr) {
      setError(updErr.message);
      setBusyId(null);
      return;
    }
    setSpecies((prev) => prev.map((s) => (s.id === id ? { ...s, points: val } : s)));
    setBusyId(null);
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove ${name} from the point list?`)) return;
    setError(null);
    setBusyId(id);
    const { error: delErr } = await supabase
      .from("club_award_species")
      .delete()
      .eq("id", id);
    if (delErr) {
      setError(delErr.message);
      setBusyId(null);
      return;
    }
    setSpecies((prev) => prev.filter((s) => s.id !== id));
    setBusyId(null);
  }

  async function addEntry() {
    const name = newName.trim();
    const val = parseInt(newPoints, 10);
    if (!name) {
      setError("Enter a name.");
      return;
    }
    if (Number.isNaN(val) || val < 0) {
      setError("Enter a valid (non-negative) point value.");
      return;
    }
    setError(null);
    setAdding(true);
    const { data, error: insErr } = await supabase
      .from("club_award_species")
      .insert({
        club_id: clubId,
        program,
        common_name: name,
        scientific_name: newSci.trim() || null,
        category: newCat.trim() || null,
        points: val,
        is_active: true,
      })
      .select(
        "id, program, common_name, scientific_name, category, points, is_active"
      )
      .single();
    if (insErr || !data) {
      setError(insErr?.message ?? "Couldn't add the entry.");
      setAdding(false);
      return;
    }
    const row = data as Species;
    setSpecies((prev) => [...prev, row]);
    setPointDraft((prev) => ({ ...prev, [row.id]: String(row.points) }));
    setNewName("");
    setNewSci("");
    setNewCat("");
    setNewPoints("");
    setAdding(false);
  }

  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";
  const numClass =
    "w-20 rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-2 py-1 text-sm text-white focus:outline-none focus:border-ocean-500";

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {error}
        </p>
      )}

      {/* Program toggle */}
      <div className="mb-5 inline-flex rounded-full border border-ocean-800/60 bg-ocean-900/60 p-1">
        <button
          onClick={() => setProgram("bap")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            program === "bap" ? "bg-ocean-700 text-white" : "text-ocean-300 hover:text-white"
          }`}
        >
          <Fish className="h-4 w-4" /> Fish (BAP)
        </button>
        <button
          onClick={() => setProgram("hap")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            program === "hap" ? "bg-ocean-700 text-white" : "text-ocean-300 hover:text-white"
          }`}
        >
          <Leaf className="h-4 w-4" /> Plants (HAP)
        </button>
      </div>

      {/* Add entry */}
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 mb-6">
        <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-ocean-300" /> Add to {program === "bap" ? "BAP" : "HAP"} list
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={program === "bap" ? "Common name (e.g. Guppy)" : "Common name (e.g. Java Fern)"}
            className={inputClass}
          />
          <input
            value={newSci}
            onChange={(e) => setNewSci(e.target.value)}
            placeholder="Scientific name (optional)"
            className={inputClass}
          />
          <input
            list={`cats-${program}`}
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Category (e.g. Cichlids)"
            className={inputClass}
          />
          <datalist id={`cats-${program}`}>
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={newPoints}
              onChange={(e) => setNewPoints(e.target.value)}
              placeholder="Points"
              className={inputClass}
            />
            <button
              onClick={addEntry}
              disabled={adding}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </div>
      </div>

      {/* The list */}
      {grouped.length === 0 ? (
        <p className="text-sm text-ocean-400">
          No entries yet — add your first one above.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs uppercase tracking-wide text-ocean-500 mb-2">
                {cat}
              </h3>
              <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 overflow-hidden">
                {items.map((s) => {
                  const busy = busyId === s.id;
                  const dirty = (pointDraft[s.id] ?? "") !== String(s.points);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-3 border-b border-ocean-800/40 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-white text-sm">
                          {s.common_name}
                        </p>
                        {s.scientific_name && (
                          <p className="truncate text-xs italic text-ocean-500">
                            {s.scientific_name}
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={pointDraft[s.id] ?? ""}
                        disabled={busy}
                        onChange={(e) =>
                          setPointDraft((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                        className={numClass}
                      />
                      <span className="text-xs text-ocean-500">pts</span>
                      {dirty && (
                        <button
                          onClick={() => savePoints(s.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-60"
                        >
                          {busy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Save
                        </button>
                      )}
                      <button
                        onClick={() => remove(s.id, s.common_name)}
                        disabled={busy}
                        className="text-ocean-500 hover:text-coral-300 transition-colors disabled:opacity-50"
                        title="Remove from list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
