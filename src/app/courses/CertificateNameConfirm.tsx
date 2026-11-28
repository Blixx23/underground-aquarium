"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2 } from "lucide-react";

/**
 * Before a course certificate is created, the member confirms the exact name
 * to print. Once they confirm, the certificate is issued and the name is
 * locked for good, so this is the one chance to get it right.
 */
export default function CertificateNameConfirm({
  courseId,
  courseTitle,
  suggestedName,
}: {
  courseId: string;
  courseTitle: string;
  suggestedName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = name.replace(/\s+/g, " ").trim();

  async function issue() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, name: clean }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't create your certificate. Try again.");
        setChecking(false);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the site. Check your connection and try again.");
      setChecking(false);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-400/30 bg-ocean-900/60 p-6 text-center sm:p-8">
      <Award className="mx-auto h-10 w-10 text-amber-300" />
      <h2 className="mt-3 font-display text-2xl text-white">You earned it</h2>
      <p className="mt-2 text-sm text-ocean-300">
        Your <span className="text-white">{courseTitle}</span> certificate is ready. First, the name to print on it, exactly as
        you want it to appear.
      </p>

      {!checking ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (clean.length >= 2) setChecking(true);
          }}
          className="mt-6 text-left"
        >
          <label htmlFor="cert-name" className="mb-1.5 block text-xs uppercase tracking-wide text-ocean-400">
            Name on your certificate
          </label>
          <input
            id="cert-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete="name"
            placeholder="First and last name"
            className="w-full rounded-xl border border-ocean-700/60 bg-ocean-950/60 px-4 py-3 text-base text-white placeholder:text-ocean-600 focus:border-amber-400/60 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-ocean-500">Use your real name. It can&apos;t be changed after your certificate is created.</p>
          {error && <p className="mt-3 rounded-lg border border-coral-500/40 bg-coral-500/10 px-3 py-2 text-sm text-coral-300">{error}</p>}
          <button
            type="submit"
            disabled={clean.length < 2}
            className="mt-5 w-full rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-ocean-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            Continue
          </button>
        </form>
      ) : (
        <div className="mt-6">
          <p className="text-sm text-ocean-300">Your certificate will say:</p>
          <p className="mt-2 break-words font-display text-3xl text-amber-200">{clean}</p>
          <p className="mt-3 text-xs text-ocean-500">Check the spelling. This can&apos;t be changed later.</p>
          {error && <p className="mt-3 rounded-lg border border-coral-500/40 bg-coral-500/10 px-3 py-2 text-sm text-coral-300">{error}</p>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={issue}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-ocean-950 transition-colors hover:bg-amber-300 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, create my certificate
            </button>
            <button
              type="button"
              onClick={() => setChecking(false)}
              disabled={busy}
              className="flex-1 rounded-full border border-ocean-700 px-5 py-3 text-sm text-ocean-200 transition-colors hover:border-ocean-500 hover:text-white"
            >
              Change it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
