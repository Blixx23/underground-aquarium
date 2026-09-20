"use client";

import { useState } from "react";
import { CalendarClock, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type SpecialDay = { id: string; day: string; closed: boolean; note: string | null };

const pretty = (day: string) =>
  new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** Holiday and one-off hours, so nobody drives to a closed shop. */
export default function StoreSpecialHours({
  storeId,
  initial,
  isOwner,
}: {
  storeId: string;
  initial: SpecialDay[];
  isOwner: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [days, setDays] = useState(initial);
  const [day, setDay] = useState("");
  const [note, setNote] = useState("");
  const [closed, setClosed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!day) return;
    setError(null);
    const { data, error: err } = await supabase
      .from("store_special_hours")
      .upsert(
        { store_id: storeId, day, closed, note: note.trim() || null },
        { onConflict: "store_id,day" }
      )
      .select("id, day, closed, note")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    setDays((d) => [...d.filter((x) => x.day !== day), data as SpecialDay].sort((a, b) => a.day.localeCompare(b.day)));
    setDay("");
    setNote("");
  }

  async function remove(id: string) {
    setDays((d) => d.filter((x) => x.id !== id));
    await supabase.from("store_special_hours").delete().eq("id", id);
  }

  if (!isOwner && days.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-white">
        <CalendarClock className="h-4 w-4 text-ocean-400" />
        Special hours
      </h2>

      {days.length > 0 && (
        <ul className="mb-3 space-y-2">
          {days.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5 text-sm"
            >
              <span className="font-medium text-amber-100">{pretty(d.day)}</span>
              <span className="text-amber-100/70">{d.closed ? "Closed" : d.note || "Special hours"}</span>
              {d.closed && d.note && <span className="text-amber-100/50">· {d.note}</span>}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  aria-label="Remove"
                  className="ml-auto text-ocean-500 hover:text-coral-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="rounded-xl border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60"
            />
            <label className="flex items-center gap-2 text-sm text-ocean-200">
              <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} className="accent-emerald-500" />
              Closed all day
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder={closed ? "Thanksgiving" : "Open 12pm–4pm"}
              className="flex-1 rounded-xl border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white placeholder-ocean-600 outline-none focus:border-emerald-500/60"
            />
            <button
              type="button"
              onClick={add}
              disabled={!day}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
        </div>
      )}
    </section>
  );
}
