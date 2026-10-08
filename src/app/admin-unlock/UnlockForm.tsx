"use client";

import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";

export default function UnlockForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const r = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (r.ok) {
      // A full load so the admin pages render with the new cookie.
      window.location.assign(next);
      return;
    }
    setError(r.error ?? "Couldn't unlock. Try again.");
    setPassword("");
    setBusy(false);
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-ocean-800/60 bg-white/5 p-8 text-center backdrop-blur"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="mb-1 font-display text-2xl text-white">Admin area</h1>
      <p className="mb-5 text-sm text-ocean-300">Enter the admin password to continue.</p>
      <input
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Admin password"
        aria-label="Admin password"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none"
      />
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={busy || !password}
        className="mt-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        {busy ? "Checking…" : "Unlock"}
      </button>
      <p className="mt-4 text-xs text-ocean-500">Stays unlocked on this device for 12 hours.</p>
    </form>
  );
}
