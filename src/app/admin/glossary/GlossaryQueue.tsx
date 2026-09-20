"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type PendingTerm = {
  id: string;
  term: string;
  definition: string;
  category: string | null;
  created_at: string;
  username: string | null;
  full_name: string | null;
};

/** Approve (with light edits) or dismiss suggested glossary terms. */
export default function GlossaryQueue({ initial }: { initial: PendingTerm[] }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState(initial);

  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-ocean-800/60 py-12 text-center text-sm text-ocean-400">Nothing waiting.</p>;
  }

  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <Item key={r.id} row={r} onDone={() => setRows((cur) => cur.filter((x) => x.id !== r.id))} supabase={supabase} />
      ))}
    </ul>
  );
}

function Item({
  row,
  onDone,
  supabase,
}: {
  row: PendingTerm;
  onDone: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [term, setTerm] = useState(row.term);
  const [definition, setDefinition] = useState(row.definition);
  const [category, setCategory] = useState(row.category ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("review_glossary_suggestion", {
      p_id: row.id,
      p_approve: approve,
      p_term: term,
      p_definition: definition,
      p_category: category || null,
    });
    setBusy(false);
    if (err) setError(err.message);
    else onDone();
  }

  const input =
    "w-full rounded-lg border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-white focus:border-ocean-500 focus:outline-none";

  return (
    <li className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4">
      <p className="mb-2 text-xs text-ocean-500">
        From {row.full_name || row.username || "someone"} · {new Date(row.created_at).toLocaleDateString()}
      </p>
      <div className="space-y-2">
        <input value={term} onChange={(e) => setTerm(e.target.value)} className={input} />
        <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={3} className={input} />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className={input} />
      </div>
      {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add to glossary
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(false)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-ocean-300 hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" /> Dismiss
        </button>
      </div>
    </li>
  );
}
