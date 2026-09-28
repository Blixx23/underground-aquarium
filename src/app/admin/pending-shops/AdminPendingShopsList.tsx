"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Store, Pencil } from "lucide-react";

export type QueueShop = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  description: string | null;
  tags: string[];
  sent_at: string | null;
  suggester_username: string | null;
  suggester_name: string | null;
};

type Action = "publish" | "reject";

type Fields = { name: string; address: string; city: string; state: string };

function whenLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const input =
  "w-full rounded-lg border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white placeholder:text-ocean-600 focus:border-emerald-500/50 focus:outline-none";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ocean-400";

export default function AdminPendingShopsList({
  initialShops,
}: {
  initialShops: QueueShop[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<QueueShop[]>(initialShops);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({ name: "", address: "", city: "", state: "" });
  const [error, setError] = useState<string | null>(null);

  function startEdit(s: QueueShop) {
    if (editing === s.id) {
      setEditing(null);
      return;
    }
    setFields({
      name: s.name,
      address: s.address ?? "",
      city: s.city ?? "",
      state: s.state ?? "",
    });
    setEditing(s.id);
  }

  async function act(s: QueueShop, action: Action) {
    if (action === "reject" && !confirm("Reject this shop? It will be hidden from the directory.")) return;
    if (action === "publish" && editing === s.id && !fields.name.trim()) {
      setError("The shop needs a name before it can go live.");
      return;
    }
    setError(null);
    setBusyId(s.id);
    try {
      const res = await fetch("/api/admin/pending-shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: s.id,
          action,
          // Only send edits when the admin actually opened the edit box.
          fields: action === "publish" && editing === s.id ? fields : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setItems((prev) => prev.filter((x) => x.id !== s.id));
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400">
        No suggested shops waiting for review.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-coral-300 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}
      {items.map((s) => {
        const who = s.suggester_username
          ? `@${s.suggester_username}`
          : s.suggester_name || "a member";
        const when = whenLabel(s.sent_at);
        const busy = busyId === s.id;
        const place = [s.address, s.city, s.state].filter(Boolean).join(", ");

        return (
          <div key={s.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-ocean-800/50 shrink-0 flex items-center justify-center">
                <Store className="w-5 h-5 text-ocean-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-medium break-words">{s.name}</h3>
                <p className="text-sm text-ocean-200 mt-1">{place || "No location given"}</p>
                <p className="text-xs text-ocean-500 mt-1">
                  Suggested by {who}
                  {when ? ` · ${when}` : ""}
                </p>
                {s.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] uppercase tracking-wide rounded-full bg-ocean-800/60 text-ocean-300 px-2 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {s.website && (
                  // Plain text on purpose: we don't link out from admin screens.
                  <p className="text-sm text-ocean-400 mt-2 break-all">Website: {s.website}</p>
                )}
                {s.description && (
                  <p className="text-sm text-ocean-300 mt-2 whitespace-pre-line break-words">
                    {s.description}
                  </p>
                )}
              </div>
            </div>

            {editing === s.id && (
              <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor={`${s.id}-name`}>Shop name</label>
                    <input
                      id={`${s.id}-name`}
                      value={fields.name}
                      onChange={(e) => setFields({ ...fields, name: e.target.value })}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={label} htmlFor={`${s.id}-address`}>Street address</label>
                    <input
                      id={`${s.id}-address`}
                      value={fields.address}
                      onChange={(e) => setFields({ ...fields, address: e.target.value })}
                      placeholder="Helps put the pin in the right spot"
                      className={input}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label} htmlFor={`${s.id}-city`}>City</label>
                    <input
                      id={`${s.id}-city`}
                      value={fields.city}
                      onChange={(e) => setFields({ ...fields, city: e.target.value })}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={label} htmlFor={`${s.id}-state`}>State</label>
                    <input
                      id={`${s.id}-state`}
                      value={fields.state}
                      onChange={(e) => setFields({ ...fields, state: e.target.value })}
                      placeholder="CA"
                      className={input}
                    />
                  </div>
                </div>
                <p className="text-xs text-ocean-500">
                  These changes are saved when you press Publish.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={() => act(s, "publish")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25 transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Publish
              </button>
              <button
                onClick={() => startEdit(s)}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors disabled:opacity-60 ${
                  editing === s.id
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                    : "border-ocean-700/60 text-ocean-300 hover:text-white hover:border-ocean-500"
                }`}
              >
                <Pencil className="w-4 h-4" /> Edit details
              </button>
              <button
                onClick={() => act(s, "reject")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-300 hover:text-white hover:border-ocean-500 transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
