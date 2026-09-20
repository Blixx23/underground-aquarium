"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Suggest a glossary term. Goes to an admin for review; an approved term
 * is added to the glossary and counts toward the Wordsmith trophies.
 */
export default function SuggestTerm({ categories }: { categories: string[] }) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  async function start() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) setSignedOut(true);
    setOpen(true);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("suggest_glossary_term", {
      p_term: term,
      p_definition: definition,
      p_category: category || null,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTerm("");
    setDefinition("");
  }

  const input =
    "w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-3 py-2.5 text-base text-white placeholder-ocean-600 focus:border-emerald-500/50 focus:outline-none sm:text-sm";

  return (
    <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg text-white">Missing a term?</p>
            <p className="text-sm text-ocean-400">
              Suggest it. Approved terms are added here and earn you the Wordsmith trophy.
            </p>
          </div>
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25"
          >
            <Plus className="h-4 w-4" /> Suggest a term
          </button>
        </div>
      ) : signedOut ? (
        <p className="text-sm text-ocean-300">
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>{" "}
          to suggest a term.
        </p>
      ) : done ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-emerald-300">
            <Check className="h-4 w-4" /> Thanks! It&apos;s waiting for review.
          </p>
          <button type="button" onClick={() => setDone(false)} className="text-sm text-ocean-300 hover:text-white">
            Suggest another
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-display text-lg text-white">Suggest a term</p>
          <input value={term} onChange={(e) => setTerm(e.target.value)} maxLength={80} placeholder="Term, e.g. Blackwater" className={input} />
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="A plain-English definition"
            className={input}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
            <option value="">Topic (optional)</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-coral-300">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send for review
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-ocean-400 hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
