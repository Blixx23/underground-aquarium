"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Loader2 } from "lucide-react";
import { CARRIERS } from "@/lib/shipping/carriers";

export default function MarkShippedButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState("usps");
  const [tracking, setTracking] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markShipped() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, carrier, tracking }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          disabled={loading}
          className="rounded-lg bg-ocean-900 border border-ocean-700/60 text-ocean-100 text-xs px-2 py-1.5 focus:outline-none focus:border-ocean-500"
        >
          {CARRIERS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Tracking # (optional)"
          disabled={loading}
          className="w-36 rounded-lg bg-ocean-900 border border-ocean-700/60 text-ocean-100 text-xs px-2 py-1.5 placeholder:text-ocean-600 focus:outline-none focus:border-ocean-500"
        />
      </div>
      <button
        onClick={markShipped}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-ocean-500/15 px-4 py-1.5 text-xs font-medium text-ocean-200 border border-ocean-500/30 hover:bg-ocean-500/25 transition-colors disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Truck className="w-3.5 h-3.5" />
        )}
        {loading ? "Saving…" : "Mark shipped"}
      </button>
      {error && <span className="text-[11px] text-red-300">{error}</span>}
    </div>
  );
}