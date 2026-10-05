"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  RENEWAL_KINDS,
  daysUntil,
  every,
  kindLabel,
  money,
  shortDate,
  timeLeft,
  type Renewal,
} from "@/lib/admin/renewals";

type Draft = {
  id?: string;
  name: string;
  kind: string;
  provider: string;
  account: string;
  expires_on: string;
  renew_months: string;
  auto_renew: "" | "yes" | "no";
  cost: string;
  remind_days: string;
  link: string;
  notes: string;
};

const blank: Draft = {
  name: "",
  kind: "domain",
  provider: "",
  account: "",
  expires_on: "",
  renew_months: "12",
  auto_renew: "",
  cost: "",
  remind_days: "30",
  link: "",
  notes: "",
};

const toDraft = (r: Renewal): Draft => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  provider: r.provider ?? "",
  account: r.account ?? "",
  expires_on: r.expires_on ?? "",
  renew_months: r.renew_months ? String(r.renew_months) : "",
  auto_renew: r.auto_renew === true ? "yes" : r.auto_renew === false ? "no" : "",
  cost: r.cost_cents === null ? "" : (r.cost_cents / 100).toFixed(2).replace(/\.00$/, ""),
  remind_days: String(r.remind_days),
  link: r.link ?? "",
  notes: r.notes ?? "",
});

const input =
  "w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:border-ocean-500 focus:outline-none";

export default function RenewalsTable({ rows, today }: { rows: Renewal[]; today: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const yearly = rows.reduce((sum, r) => {
    if (r.cost_cents === null || !r.renew_months) return sum;
    return sum + (r.cost_cents * 12) / r.renew_months;
  }, 0);

  async function call(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save that.");
      if (data.expires_on) setNote(`Renewed. Now expires ${shortDate(data.expires_on)}.`);
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
    if (draft && (await call("save", { action: "save", ...draft }))) setDraft(null);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ocean-400">
          {rows.length} tracked
          {yearly > 0 ? ` · about ${money(Math.round(yearly))} a year` : ""}
        </p>
        {!draft && (
          <button
            type="button"
            onClick={() => setDraft({ ...blank })}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </div>

      {error && <p className="mb-3 rounded-xl border border-coral-500/40 bg-coral-500/10 px-3 py-2 text-sm text-coral-300">{error}</p>}
      {note && <p className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{note}</p>}

      {draft && (
        <div className="mb-6 rounded-2xl border border-ocean-700/70 bg-ocean-900/60 p-4">
          <p className="mb-3 font-medium text-white">{draft.id ? `Edit ${draft.name || "row"}` : "Add something that expires"}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-ocean-400 sm:col-span-2">
              Name
              <input
                className={`${input} mt-1`}
                value={draft.name}
                maxLength={200}
                placeholder="undergroundaquarium.com domain"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400">
              Kind
              <select className={`${input} mt-1`} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
                {RENEWAL_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ocean-400">
              Provider
              <input
                className={`${input} mt-1`}
                value={draft.provider}
                placeholder="Bluehost"
                onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400 sm:col-span-2">
              Account it&apos;s under (an email, never a password)
              <input
                className={`${input} mt-1`}
                value={draft.account}
                placeholder="chris@undergroundaquarium.com"
                onChange={(e) => setDraft({ ...draft, account: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400">
              Expires
              <input
                type="date"
                className={`${input} mt-1`}
                value={draft.expires_on}
                onChange={(e) => setDraft({ ...draft, expires_on: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400">
              Renews every (months)
              <input
                type="number"
                min={1}
                max={120}
                className={`${input} mt-1`}
                value={draft.renew_months}
                placeholder="12"
                onChange={(e) => setDraft({ ...draft, renew_months: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400">
              Auto-renew
              <select
                className={`${input} mt-1`}
                value={draft.auto_renew}
                onChange={(e) => setDraft({ ...draft, auto_renew: e.target.value as Draft["auto_renew"] })}
              >
                <option value="">Not sure</option>
                <option value="yes">On</option>
                <option value="no">Off</option>
              </select>
            </label>
            <label className="text-xs text-ocean-400">
              Cost each renewal ($)
              <input
                inputMode="decimal"
                className={`${input} mt-1`}
                value={draft.cost}
                placeholder="20"
                onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400">
              Warn me (days before)
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
              Link to manage it
              <input
                className={`${input} mt-1`}
                value={draft.link}
                placeholder="https://"
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
              />
            </label>
            <label className="text-xs text-ocean-400 sm:col-span-3">
              Notes
              <textarea
                rows={2}
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

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-6 text-center text-ocean-400">
          Nothing tracked yet. Add your domain, the DMCA agent and any subscriptions the site depends on.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ocean-800/60">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-ocean-900/70 text-xs uppercase tracking-wide text-ocean-400">
              <tr>
                <th className="px-4 py-3 font-medium">What</th>
                <th className="px-3 py-3 font-medium">Kind</th>
                <th className="px-3 py-3 font-medium">Expires</th>
                <th className="px-3 py-3 font-medium">Left</th>
                <th className="px-3 py-3 font-medium">Renews</th>
                <th className="px-3 py-3 font-medium">Cost</th>
                <th className="px-3 py-3 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-800/60">
              {rows.map((r) => {
                const days = r.expires_on ? daysUntil(r.expires_on, today) : null;
                const warn = r.remind_on !== null && r.remind_on <= today;
                const rowTone = days !== null && days < 0 ? "bg-coral-500/10" : warn ? "bg-amber-400/[0.07]" : "bg-ocean-900/30";
                const chip =
                  days === null
                    ? "bg-ocean-800 text-ocean-400"
                    : days < 0
                      ? "bg-coral-500/20 text-coral-300"
                      : warn
                        ? "bg-amber-400/20 text-amber-200"
                        : "bg-emerald-500/10 text-emerald-300";
                return (
                  <tr key={r.id} className={`align-top ${rowTone}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{r.name}</p>
                      <p className="text-xs text-ocean-400">
                        {[r.provider, r.account].filter(Boolean).join(" · ")}
                      </p>
                      {r.notes && <p className="mt-1 max-w-sm text-xs text-ocean-500">{r.notes}</p>}
                    </td>
                    <td className="px-3 py-3 text-ocean-300">{kindLabel(r.kind)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ocean-200">
                      {r.expires_on ? shortDate(r.expires_on) : <span className="text-ocean-500">Add date</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${chip}`}>
                        {days === null ? "unknown" : timeLeft(days)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ocean-300">
                      <span className="block whitespace-nowrap">{every(r.renew_months) || "once"}</span>
                      <span className="block text-xs text-ocean-500">
                        {r.auto_renew === true ? "auto-renew on" : r.auto_renew === false ? "renew by hand" : "auto-renew ?"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-ocean-300">{money(r.cost_cents) || "-"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {r.link && (
                          <a
                            href={r.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open where it's managed"
                            className="rounded-lg p-1.5 text-ocean-400 hover:bg-ocean-800 hover:text-white"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {r.expires_on && r.renew_months && (
                          <button
                            type="button"
                            title={`Renewed: move the expiry forward ${every(r.renew_months)}`}
                            onClick={() => call(`renew-${r.id}`, { action: "renewed", id: r.id })}
                            disabled={busy === `renew-${r.id}`}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Renewed
                          </button>
                        )}
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setDraft(toDraft(r))}
                          className="rounded-lg p-1.5 text-ocean-400 hover:bg-ocean-800 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {confirmDelete === r.id ? (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                await call(`del-${r.id}`, { action: "delete", id: r.id });
                                setConfirmDelete(null);
                              }}
                              className="whitespace-nowrap rounded-lg bg-coral-500/20 px-2 py-1.5 text-xs text-coral-300 hover:bg-coral-500/30"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              aria-label="Keep it"
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg p-1.5 text-ocean-400 hover:text-white"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setConfirmDelete(r.id)}
                            className="rounded-lg p-1.5 text-ocean-500 hover:bg-ocean-800 hover:text-coral-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
