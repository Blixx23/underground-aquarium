"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SuggestSpecies({
  initialName = "",
  defaultOpen = false,
}: {
  initialName?: string;
  defaultOpen?: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(defaultOpen);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [commonName, setCommonName] = useState(initialName);
  const [scientificName, setScientificName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !checkedAuth) {
      supabase.auth.getUser().then(({ data }) => {
        setUserId(data.user?.id ?? null);
        setCheckedAuth(true);
      });
    }
  }, [open, checkedAuth, supabase]);

  async function submit() {
    if (submitting) return;
    if (!commonName.trim()) {
      setError("Please enter at least a common name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setError("Please sign in to suggest a species.");
        setSubmitting(false);
        return;
      }
      const { error: insertError } = await supabase
        .from("species_suggestions")
        .insert({
          suggester_id: u.user.id,
          common_name: commonName.trim(),
          scientific_name: scientificName.trim() || null,
          note: note.trim() || null,
        });
      if (insertError) throw insertError;
      setDone(true);
      setOpen(false);
    } catch {
      setError("Couldn't submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-emerald-300">
        Thanks — your suggestion was sent for review. We add new species after
        checking their care details.
      </p>
    );
  }

  if (!open) {
    return (
      <div>
        <h2 className="font-display text-xl text-white mb-1">
          Don&apos;t see a species?
        </h2>
        <p className="text-ocean-400 text-sm mb-4">
          Suggest a fish or other aquarium animal and we&apos;ll review it for
          the database.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
        >
          <Plus className="w-4 h-4" /> Suggest a species
        </button>
      </div>
    );
  }

  if (checkedAuth && !userId) {
    return (
      <div className="text-sm text-ocean-300">
        <Link
          href="/login"
          className="text-emerald-400 hover:text-emerald-300 font-medium"
        >
          Sign in
        </Link>{" "}
        to suggest a species for the database.
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <div className="space-y-3">
        <input
          type="text"
          value={commonName}
          onChange={(e) => setCommonName(e.target.value)}
          placeholder="Common name (e.g. Clown Killifish)"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
        />
        <input
          type="text"
          value={scientificName}
          onChange={(e) => setScientificName(e.target.value)}
          placeholder="Scientific name (optional)"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Care notes, a link, or why you'd like it added (optional)"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
        />
      </div>
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit suggestion"}
        </button>
        {!defaultOpen && (
          <button
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="rounded-lg border border-white/10 text-ocean-300 px-3 py-2.5 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}