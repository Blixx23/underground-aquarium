"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STORE_TYPES = [
  { value: "freshwater", label: "Freshwater" },
  { value: "saltwater", label: "Saltwater" },
  { value: "corals", label: "Corals / reef" },
  { value: "plants", label: "Plants" },
  { value: "reptiles", label: "Reptiles" },
  { value: "dry goods", label: "Dry goods" },
];

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "store"}-${suffix}`;
}

export default function SuggestStore() {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setCheckedAuth(true);
    });
  }, [open, supabase]);

  function toggleType(value: string) {
    setTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("fish_stores").insert({
        name: trimmed,
        slug: slugify(trimmed),
        city: city.trim() || null,
        state: state.trim() || null,
        website: website.trim() || null,
        description: note.trim() || null,
        tags: types,
        source: "user",
        status: "pending",
        submitted_by: userId,
      });
      if (insertError) throw insertError;
      setDone(true);
    } catch {
      setError("Couldn't submit — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
        <p className="text-white font-medium mb-1">Thanks for the suggestion!</p>
        <p className="text-ocean-400 text-sm">
          We&apos;ll review it and add it to the directory.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-white font-medium">
            Know a store we&apos;re missing?
          </p>
          <p className="text-ocean-400 text-sm">
            Suggest a local fish store and we&apos;ll add it to the directory.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Suggest a store
        </button>
      </div>
    );
  }

  if (checkedAuth && !userId) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <p className="text-ocean-300 text-sm">
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in
          </Link>{" "}
          to suggest a store.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <p className="text-white font-medium mb-4">Suggest a fish store</p>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Store name (required)"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
        />

        <div>
          <p className="text-ocean-300 text-sm mb-2">
            What kind of store is it?
          </p>
          <div className="flex flex-wrap gap-2">
            {STORE_TYPES.map((opt) => {
              const active = types.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleType(opt.value)}
                  className={
                    "rounded-full px-3 py-1.5 text-sm border transition-colors " +
                    (active
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-ocean-300 hover:text-white hover:border-white/20")
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
          />
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State (e.g. CA)"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
          />
        </div>

        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website (optional)"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
        />

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Anything else? (address, what they're known for, etc.)"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
        />

        {error && <p className="text-xs text-red-300">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit suggestion"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-white/10 text-ocean-300 px-4 py-2.5 text-sm hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}