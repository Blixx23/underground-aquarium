"use client";

import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";

export default function BuyButton({
  productId,
  stock,
}: {
  productId: string;
  stock: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soldOut = typeof stock === "number" && stock <= 0;

  async function handleBuy() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout.");
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
        <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300 mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handleBuy}
        disabled={loading || soldOut}
        className="inline-flex w-full items-center justify-center gap-2 px-6 py-4 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ShoppingBag className="w-5 h-5" />
        )}
        {soldOut ? "Out of stock" : loading ? "Starting checkout…" : "Buy now"}
      </button>
    </div>
  );
}