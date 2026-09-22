"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const KINDS: [string, string][] = [
  ["hours", "Hours are wrong"],
  ["closed", "Closed for good"],
  ["moved", "Moved to a new address"],
  ["phone", "Phone number is wrong"],
  ["website", "Website is wrong"],
  ["name", "Name is wrong"],
  ["other", "Something else"],
];

/** Shoppers flag wrong details; it goes to the admin queue, nothing changes live. */
export default function SuggestFix({ storeId, currentUserId }: { storeId: string; currentUserId: string | null }) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("hours");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!currentUserId || body.trim().length < 2) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("store_edit_suggestions")
      .insert({ store_id: storeId, user_id: currentUserId, kind, body: body.trim() });
    setBusy(false);
    if (err) setError(err.message);
    else setDone(true);
  }

  if (done) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3.5 py-2.5 text-sm text-emerald-200">
        <Check className="h-4 w-4" /> Thanks! We&apos;ll check it and update the page.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 px-1 text-xs text-ocean-500 transition-colors hover:text-ocean-200"
      >
        <Flag className="h-3.5 w-3.5" /> Something wrong here? Suggest a fix
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="mb-3 text-sm font-medium text-white">Suggest a fix</p>
      {!currentUserId ? (
        <p className="text-sm text-ocean-400">
          <Link href="/login" className="text-ocean-200 underline">
            Sign in
          </Link>{" "}
          to send a fix.
        </p>
      ) : (
        <>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="mb-2 w-full rounded-xl border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white"
          >
            {KINDS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder={
              kind === "hours"
                ? "e.g. Tue–Sat 11–7, Sun 12–5, closed Mondays"
                : kind === "moved"
                ? "New address"
                : "What should it say?"
            }
            className="w-full resize-none rounded-xl border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white placeholder-ocean-600 outline-none focus:border-ocean-500"
          />
          {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={busy || body.trim().length < 2}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ocean-500 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-400 disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-ocean-500 hover:text-ocean-200">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
