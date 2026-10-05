"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Pencil, Plus, Repeat, RotateCcw, Trash2, X } from "lucide-react";
import {
  KEY_DATE_CATEGORIES,
  categoryLabel,
  countdown,
  daysUntil,
  longDate,
  type KeyDate,
} from "@/lib/admin/keyDates";

type Draft = {
  id?: string;
  title: string;
  due_on: string;
  category: string;
  notes: string;
  link: string;
  repeat_months: string;
  remind_days: string;
};

const blank: Draft = { title: "", due_on: "", category: "legal", notes: "", link: "", repeat_months: "", remind_days: "30" };

const toDraft = (d: KeyDate): Draft => ({
  id: d.id,
  title: d.title,
  due_on: d.due_on,
  category: d.category,
  notes: d.notes ?? "",
  link: d.link ?? "",
  repeat_months: d.repeat_months ? String(d.repeat_months) : "",
  remind_days: String(d.remind_days),
});

const input =
  "w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:border-ocean-500 focus:outline-none";

export default function KeyDatesBoard({ initial, today }: { initial: KeyDate[]; today: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const open = initial.filter((d) => !d.done_at);
  const done = initial.filter((d) => d.done_at).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  async function call(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save that.");
      if (data.rolledTo) setNote(`Done. Next one is due ${longDate(data.rolledTo)}.`);
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft) return;
    if (await call("save", { action: "save", ...draft })) setDraft(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ocean-400">
          {open.length} open{done.length ? `, ${done.length} done` : ""}
        </p>
        {!draft && (
          <button
            type="button"
            onClick={() => setDraft({ ...blank })}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Add a date
          </button>
        )}
      </div>

      {error && <p className="mb-3 rounded-xl border border-coral-500/40 bg-coral-500/10 px-3 py-2 text-sm text-coral-300">{error}</p>}
      {note && <p className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{note}</p>}

      {draft && (
        <div className="mb-6 rounded-2xl border border-ocean-700/70 bg-ocean-900/60 p-4">
          <p className="mb-3 font-medium text-white">{draft.id ? "Edit date" : "New date"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs text-ocean-400">
              What is it?
              <input
                className={`${input} mt-1`}
                value={draft.title}
                maxLength={200}
                placeholder="Renew undergroundaquarium.com domain"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400">
              Due date
              <input
                type="date"
                className={`${input} mt-1`}
                value={draft.due_on}
                onChange={(e) => setDraft({ ...draft, due_on: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400">
              Kind
              <select
                className={`${input} mt-1`}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {KEY_DATE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ocean-400">
              Remind me this many days before
              <input
                type="number"
                min={0}
                max={365}
                className={`${input} mt-1`}
                value={draft.remind_days}
                onChange={(e) => setDraft({ ...draft, remind_days: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400">
              Repeats every (months, blank if one-off)
              <input
                type="number"
                min={1}
                max={120}
                className={`${input} mt-1`}
                value={draft.repeat_months}
                placeholder="12 for yearly"
                onChange={(e) => setDraft({ ...draft, repeat_months: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-ocean-400">
              Link (optional)
              <input
                className={`${input} mt-1`}
                value={draft.link}
                placeholder="https://"
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-ocean-400">
              Notes (optional)
              <textarea
                rows={3}
                className={`${input} mt-1 resize-y`}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy === "save"}
              className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              className="rounded-full border border-ocean-700 px-5 py-2 text-sm text-ocean-200 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {open.length === 0 && !draft ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-6 text-center text-ocean-400">
          No dates yet. Add renewals, filings and deadlines so nothing sneaks up on you.
        </div>
      ) : (
        <ul className="space-y-2">
          {open.map((d) => {
            const days = daysUntil(d.due_on, today);
            const tone =
              days < 0
                ? "border-coral-500/50 bg-coral-500/10"
                : d.remind_on <= today
                  ? "border-amber-400/40 bg-amber-400/[0.07]"
                  : "border-ocean-800/60 bg-ocean-900/40";
            const chip =
              days < 0 ? "bg-coral-500/20 text-coral-300" : d.remind_on <= today ? "bg-amber-400/20 text-amber-200" : "bg-ocean-800/80 text-ocean-300";
            return (
              <li key={d.id} className={`rounded-2xl border p-4 ${tone}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{d.title}</p>
                    <p className="mt-0.5 text-sm text-ocean-300">
                      {longDate(d.due_on)} · {categoryLabel(d.category)}
                      {d.repeat_months ? (
                        <span className="ml-1 inline-flex items-center gap-1 text-ocean-400">
                          · <Repeat className="h-3 w-3" /> every {d.repeat_months} months
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${chip}`}>{countdown(days)}</span>
                </div>
                {d.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-ocean-300">{d.notes}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  {d.link && (
                    <a
                      href={d.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-ocean-700 px-3 py-1 text-ocean-200 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => call(`done-${d.id}`, { action: "done", id: d.id })}
                    disabled={busy === `done-${d.id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> {d.repeat_months ? "Done, schedule next" : "Mark done"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(toDraft(d))}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-ocean-400 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {confirmDelete === d.id ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await call(`del-${d.id}`, { action: "delete", id: d.id });
                          setConfirmDelete(null);
                        }}
                        className="rounded-full bg-coral-500/20 px-3 py-1 text-coral-300 hover:bg-coral-500/30"
                      >
                        Delete for good
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        aria-label="Keep it"
                        className="rounded-full p-1 text-ocean-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(d.id)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-ocean-500 hover:text-coral-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-8">
          <button type="button" onClick={() => setShowDone(!showDone)} className="text-sm text-ocean-400 hover:text-white">
            {showDone ? "Hide" : "Show"} {done.length} done
          </button>
          {showDone && (
            <ul className="mt-3 space-y-2">
              {done.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/30 px-4 py-3 text-sm"
                >
                  <span className="min-w-0 text-ocean-400">
                    <span className="text-ocean-200 line-through decoration-ocean-600">{d.title}</span> · was due{" "}
                    {longDate(d.due_on)}
                  </span>
                  <button
                    type="button"
                    onClick={() => call(`re-${d.id}`, { action: "reopen", id: d.id })}
                    className="inline-flex shrink-0 items-center gap-1 text-ocean-400 hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reopen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
