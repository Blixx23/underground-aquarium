"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function SetupButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetup() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start payout setup.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300 mb-6">
          {error}
        </div>
      )}
      <button
        onClick={handleSetup}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Starting…" : label}
      </button>
    </div>
  );
}