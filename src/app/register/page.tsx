"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!/^[A-Za-z0-9_]+$/.test(cleanUsername)) {
      setError(
        "Username can only contain letters, numbers, and underscores — no spaces or other symbols."
      );
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: cleanUsername },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is on, there's no session yet — show the confirmation panel.
    if (data.user && !data.session) {
      setSubmitted(true);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/profile");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-20">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        {submitted ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ocean-500/15 text-ocean-300">
              <MailCheck className="h-7 w-7" />
            </div>
            <h1 className="mb-2 font-display text-2xl text-white">Check your inbox</h1>
            <p className="mb-4 text-sm leading-relaxed text-ocean-300">
              We sent a confirmation link to{" "}
              <span className="font-medium text-white">{email}</span>. Click it to verify
              your account, then come back and log in.
            </p>
            <p className="mb-6 text-xs text-ocean-500">
              Don&apos;t see it within a minute or two? Check your spam folder.
            </p>
            <Link
              href="/login"
              className="inline-block w-full rounded-lg bg-ocean-500 px-4 py-2 font-medium text-white transition hover:bg-ocean-400"
            >
              Go to log in
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setError(null);
              }}
              className="mt-4 text-xs text-ocean-400 transition-colors hover:text-ocean-200"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">
              Join the tank
            </p>
            <h1 className="mb-6 font-display text-3xl text-white">Create account</h1>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
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
                  Letters, numbers, and underscores only — no spaces or symbols.
                </span>
              </label>

              <label className="flex flex-col gap-1 text-sm text-ocean-400">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-ocean-400">
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500"
                />
              </label>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-lg bg-ocean-500 px-4 py-2 font-medium text-white transition hover:bg-ocean-400 disabled:opacity-50"
              >
                {loading ? "Creating account…" : "Register"}
              </button>
            </form>

            <p className="mt-6 text-sm text-ocean-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-white hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}