"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";

export default function ClubPayoutButton({
  clubId,
  label,
}: {
  clubId: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetup() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clubs/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
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
      {error && <p className="text-sm text-coral-300 mb-3">{error}</p>}
      <button
        onClick={handleSetup}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean-700 text-white text-sm font-medium hover:bg-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4" />
        )}
        {loading ? "Starting…" : label}
      </button>
    </div>
  );
}
