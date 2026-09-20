"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SOC_BTN_PRIMARY } from "@/lib/society/theme";
import type { AwardSpecies } from "@/components/society/SpeciesBrowser";
import SpeciesPicker, { SPECIES_OTHER } from "@/components/society/SpeciesPicker";

/**
 * Opens a spawn log — the first and only moment an entry can begin.
 *
 * Everything else about a log is append-only, so this form is deliberately
 * short: what you're breeding, and anything worth noting about the setup.
 */
export default function OpenLogForm({
  clubId,
  species,
  initialSpeciesId,
}: {
  clubId: string;
  species: AwardSpecies[];
  initialSpeciesId?: string;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // "" = nothing chosen yet, SPECIES_OTHER = not on the list, anything else = a species id.
  const [speciesId, setSpeciesId] = useState(initialSpeciesId ?? "");
  const [otherName, setOtherName] = useState("");
  const [tankNote, setTankNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOther = speciesId === SPECIES_OTHER;
  const selected = species.find((s) => s.id === speciesId);

  async function open() {
    setError(null);
    if (!speciesId) {
      setError("Pick the species you're breeding, or choose Not on the list.");
      return;
    }
    if (isOther && !otherName.trim()) {
      setError("Name the species you're breeding.");
      return;
    }

    setBusy(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("open_spawn_log", {
        p_club_id: clubId,
        p_species_id: isOther ? null : speciesId,
        p_species_name: isOther ? otherName.trim() : selected?.common_name ?? "",
        p_tank_note: tankNote.trim() || null,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) throw new Error("The log didn't come back. Try again.");
      router.push(`/society/logs/${row.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't open the log."
      );
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-4 py-3 text-base text-white placeholder-ocean-600 focus:border-amber-500/50 focus:outline-none sm:text-sm";

  return (
    <div className="max-w-xl space-y-5">
      {error && (
        <p className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-200">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-sm text-ocean-300">Species</label>
        <SpeciesPicker
          species={species}
          value={speciesId}
          onChange={(v, typed) => {
            setSpeciesId(v);
            setError(null);
            // Searched for a fish that isn't listed? Keep what they typed.
            if (v === SPECIES_OTHER && typed && !otherName.trim()) setOtherName(typed);
          }}
        />
      </div>

      {isOther && (
        <div>
          <label className="mb-2 block text-sm text-ocean-300">
            What are you breeding?
          </label>
          <input
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            placeholder="Common or scientific name"
            className={inputClass}
          />
          <p className="mt-2 text-xs text-ocean-500">
            Anything not on the point list gets classified before judging, so
            you&apos;re never blocked from starting.
          </p>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm text-ocean-300">
          Setup notes (optional)
        </label>
        <textarea
          value={tankNote}
          onChange={(e) => setTankNote(e.target.value)}
          rows={3}
          placeholder="Tank size, water, how many you're pairing…"
          className={inputClass}
        />
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-100/70">
        Opening the log issues your challenge code and starts the clock. Stage
        1 is a photo of the pair in the tank, with that code on a card beside
        it — before anything has happened.
      </div>

      <button
        onClick={open}
        disabled={busy}
        className={`${SOC_BTN_PRIMARY} w-full px-8 disabled:opacity-60 sm:w-auto`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Open the log
      </button>
    </div>
  );
}
