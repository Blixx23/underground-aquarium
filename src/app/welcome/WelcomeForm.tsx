"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function WelcomeForm({
  suggested,
  firstName,
  next,
}: {
  suggested: string;
  firstName: string | null;
  next: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(suggested);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const clean = username.trim();
    if (!/^[A-Za-z0-9_]{3,24}$/.test(clean)) {
      setError("Usernames are 3 to 24 letters, numbers, or underscores. No spaces or symbols.");
      return;
    }
    if (!accepted) {
      setError("Please confirm you are 18 or older and agree to the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/choose-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: clean, accepted: true }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-20">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">
          Almost in
        </p>
        <h1 className="mb-2 font-display text-3xl text-white">
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
        <p className="mb-6 text-sm text-ocean-300">
          Pick the username people will see on your posts, tanks and listings.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ocean-400">
            Username
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500"
            />
            <span className="text-xs text-ocean-600">
              Letters, numbers, and underscores only. No spaces or symbols.
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-ocean-300">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-ocean-500"
            />
            <span>
              I confirm I am 18 or older and agree to the{" "}
              <Link href="/terms" target="_blank" className="text-white hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-white hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !accepted}
            className="mt-2 rounded-lg bg-ocean-500 px-4 py-2 font-medium text-white transition hover:bg-ocean-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
