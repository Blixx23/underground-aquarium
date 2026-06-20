"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fish, Leaf, Send, Loader2, Check, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AwardSpecies = {
  id: string;
  program: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  points: number;
};

export default function SubmissionForm({
  clubId,
  slug,
  userId,
  species,
}: {
  clubId: string;
  slug: string;
  userId: string;
  species: AwardSpecies[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [program, setProgram] = useState<"bap" | "hap">("bap");
  const [speciesId, setSpeciesId] = useState(""); // "" = none, "other" = write-in
  const [customName, setCustomName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Entries for the chosen program, grouped by category for the dropdown
  const grouped = useMemo(() => {
    const list = species.filter((s) => s.program === program);
    const map = new Map<string, AwardSpecies[]>();
    for (const s of list) {
      const key = s.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [species, program]);

  const selected = species.find((s) => s.id === speciesId) || null;

  const MAX_PHOTOS = 4;
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    setFiles((prev) => [...prev, ...Array.from(picked)].slice(0, MAX_PHOTOS));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function switchProgram(p: "bap" | "hap") {
    setProgram(p);
    setSpeciesId("");
    setCustomName("");
  }

  function resetForm() {
    setSpeciesId("");
    setCustomName("");
    setEventDate("");
    setNotes("");
    setFiles([]);
  }

  async function submit() {
    setError(null);

    const isOther = speciesId === "other";
    const name = isOther ? customName.trim() : selected?.common_name;

    if (!speciesId) {
      setError("Pick a species or choose “Other”.");
      return;
    }
    if (isOther && !name) {
      setError("Enter the species or plant name.");
      return;
    }

    setSaving(true);
    try {
      // Upload any photos to the shared product-images bucket first.
      const photoUrls: string[] = [];
      for (const file of files.slice(0, MAX_PHOTOS)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `awards/${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        photoUrls.push(pub.publicUrl);
      }

      const { error: insErr } = await supabase
        .from("club_award_submissions")
        .insert({
          club_id: clubId,
          user_id: userId,
          program,
          species_id: isOther ? null : speciesId,
          species_name: name,
          event_date: eventDate || null,
          notes: notes.trim() || null,
          photos: photoUrls,
          status: "pending",
        });
      if (insErr) throw insErr;
      setSubmitted(true);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  // ---- Success state ----
  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-5 w-5 text-emerald-300" />
        </div>
        <p className="font-medium text-white">Submission received</p>
        <p className="mt-1 text-sm text-ocean-300">
          It&apos;s now pending review by a club officer. You&apos;ll be notified
          when it&apos;s approved.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setSubmitted(false)}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ocean-600"
          >
            Submit another
          </button>
          <Link
            href={`/c/${slug}`}
            className="inline-flex items-center rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-200 transition-colors hover:bg-ocean-800/60"
          >
            Back to club
          </Link>
        </div>
      </div>
    );
  }

  // ---- Form ----
  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      {error && (
        <p className="mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {error}
        </p>
      )}

      {/* Program toggle */}
      <div className="mb-5 inline-flex rounded-full border border-ocean-800/60 bg-ocean-900/60 p-1">
        <button
          onClick={() => switchProgram("bap")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            program === "bap" ? "bg-ocean-700 text-white" : "text-ocean-300 hover:text-white"
          }`}
        >
          <Fish className="h-4 w-4" /> Fish (BAP)
        </button>
        <button
          onClick={() => switchProgram("hap")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            program === "hap" ? "bg-ocean-700 text-white" : "text-ocean-300 hover:text-white"
          }`}
        >
          <Leaf className="h-4 w-4" /> Plants (HAP)
        </button>
      </div>

      {/* Species picker */}
      <label className="mb-1 block text-sm font-medium text-white">
        {program === "bap" ? "Species you bred" : "Plant you propagated"}
      </label>
      <select
        value={speciesId}
        onChange={(e) => setSpeciesId(e.target.value)}
        className={inputClass}
      >
        <option value="">
          Select a {program === "bap" ? "species" : "plant"}…
        </option>
        {grouped.map(([cat, items]) => (
          <optgroup key={cat} label={cat}>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.common_name} — {s.points} pts
              </option>
            ))}
          </optgroup>
        ))}
        <option value="other">Other (not on the list)</option>
      </select>

      {selected && (
        <p className="mt-1 text-xs text-ocean-400">
          {selected.scientific_name && <em>{selected.scientific_name} · </em>}
          worth ~{selected.points} pts (an officer confirms the points at approval)
        </p>
      )}

      {speciesId === "other" && (
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={program === "bap" ? "Species name" : "Plant name"}
          className={`${inputClass} mt-2`}
        />
      )}

      {/* Date */}
      <label className="mb-1 mt-4 block text-sm font-medium text-white">
        {program === "bap" ? "Date it spawned" : "Date you propagated it"}{" "}
        <span className="font-normal text-ocean-500">(optional)</span>
      </label>
      <input
        type="date"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
        className={inputClass}
      />

      {/* Notes */}
      <label className="mb-1 mt-4 block text-sm font-medium text-white">
        How you did it{" "}
        <span className="font-normal text-ocean-500">(optional, but encouraged)</span>
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Tank setup, water params, conditioning, what triggered the spawn…"
        className={`${inputClass} resize-y`}
      />

      {/* Photos */}
      <label className="mb-1 mt-4 block text-sm font-medium text-white">
        Photos{" "}
        <span className="font-normal text-ocean-500">
          (optional, up to {MAX_PHOTOS})
        </span>
      </label>
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-ocean-800/60 bg-ocean-900/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[i]}
                alt={f.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-ocean-950/80 p-0.5 text-ocean-200 hover:text-white"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length < MAX_PHOTOS && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-ocean-200 transition-colors hover:bg-ocean-800/60">
          <ImagePlus className="h-4 w-4" /> Add photo
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-600 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit for review
      </button>
    </div>
  );
}
