"use client";

import { useState } from "react";
import { Fish, Plus, X, Loader2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type StockItem = { id: string; name: string; note: string | null; created_at: string };

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};

/**
 * "In stock right now": the short list a shop keeps current. Hobbyists
 * check it before driving over; the shop updates it in seconds.
 */
export default function StoreStock({
  storeId,
  initial,
  isOwner,
}: {
  storeId: string;
  initial: StockItem[];
  isOwner: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("store_stock")
      .insert({ store_id: storeId, name: clean, note: note.trim() || null })
      .select("id, name, note, created_at")
      .single();
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setItems((x) => [data as StockItem, ...x]);
    setName("");
    setNote("");
  }

  async function remove(id: string) {
    setItems((x) => x.filter((i) => i.id !== id));
    await supabase.from("store_stock").delete().eq("id", id);
  }

  if (!isOwner && items.length === 0) return null;
  const newest = items[0]?.created_at;

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl text-white">
          <Fish className="h-5 w-5 text-emerald-400" />
          In stock right now
        </h2>
        {newest && (
          <p className="flex items-center gap-1.5 text-xs text-ocean-500">
            <Clock className="h-3.5 w-3.5" /> updated {ago(newest)}
          </p>
        )}
      </div>

      {isOwner && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-sm text-ocean-300">
            List what you have in today. Keep it short and current; people trust a list that changes.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Blue Angelfish"
              className="flex-1 rounded-xl border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white placeholder-ocean-600 outline-none focus:border-emerald-500/60"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="Six left, 2 inch"
              className="flex-1 rounded-xl border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white placeholder-ocean-600 outline-none focus:border-emerald-500/60"
            />
            <button
              type="button"
              onClick={add}
              disabled={busy || !name.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ocean-500">Nothing listed yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white">{i.name}</span>
                {i.note && <span className="block truncate text-xs text-ocean-400">{i.note}</span>}
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => remove(i.id)}
                  aria-label={`Remove ${i.name}`}
                  className="text-ocean-500 transition-colors hover:text-coral-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
