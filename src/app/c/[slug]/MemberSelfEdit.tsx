"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MemberSelfEdit({
  clubId,
  initialName,
  initialEmail,
}: {
  clubId: string;
  initialName: string | null;
  initialEmail: string | null;
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors";

  async function save() {
    if (busy) return;
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Please enter a valid email, or leave it blank.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("update_my_club_contact", {
      p_club_id: clubId,
      p_display_name: name.trim(),
      p_email: email.trim(),
    });
    if (e) {
      setError("Couldn't save your details. Please try again.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setEditing(false);
    setSaved(true);
    router.refresh();
  }

  function cancel() {
    setName(initialName ?? "");
    setEmail(initialEmail ?? "");
    setError(null);
    setEditing(false);
  }

  return (
    <div className="mt-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-lg text-white">Your details</h2>
        {!editing && (
          <button
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-ocean-300 hover:text-white transition-colors"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {error}
        </p>
      )}

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-ocean-400">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How you appear on the roster"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ocean-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contact email for the club"
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-600 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
            <button
              onClick={cancel}
              disabled={busy}
              className="rounded-full bg-ocean-800 px-4 py-2 text-sm text-ocean-200 transition-colors hover:bg-ocean-700 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="text-ocean-500 w-20 shrink-0">Name</dt>
            <dd className="text-ocean-200">
              {initialName || (
                <span className="text-ocean-500">Not set</span>
              )}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-ocean-500 w-20 shrink-0">Email</dt>
            <dd className="text-ocean-200 break-all">
              {initialEmail || (
                <span className="text-ocean-500">Not set</span>
              )}
            </dd>
          </div>
          {saved && (
            <p className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <Check className="w-3.5 h-3.5" /> Saved
            </p>
          )}
        </dl>
      )}
    </div>
  );
}
