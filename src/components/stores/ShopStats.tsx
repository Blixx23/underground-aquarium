"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  last30: Record<string, number>;
  prev30: Record<string, number>;
  daily: { day: string; n: number }[];
};

const LABEL: [string, string][] = [
  ["view", "Page views"],
  ["directions", "Directions"],
  ["phone", "Phone taps"],
  ["website", "Website taps"],
];

/** What people did on the shop's page over the last 30 days. */
export default function ShopStats({ storeId }: { storeId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    createClient()
      .rpc("store_stats", { p_store: storeId })
      .then(({ data }) => setStats((data ?? null) as Stats | null));
  }, [storeId]);

  if (!stats) return null;

  const max = Math.max(1, ...stats.daily.map((d) => d.n));
  const anything = LABEL.some(([k]) => (stats.last30[k] ?? 0) > 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-ocean-500">Last 30 days</p>

      {!anything ? (
        <p className="text-sm text-ocean-400">
          Nothing counted yet. Share your page and the numbers start filling in.
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LABEL.map(([key, label]) => {
              const now = stats.last30[key] ?? 0;
              const before = stats.prev30[key] ?? 0;
              const change = before === 0 ? null : Math.round(((now - before) / before) * 100);
              return (
                <div key={key}>
                  <p className="text-xs text-ocean-500">{label}</p>
                  <p className="font-display text-xl text-white">{now.toLocaleString()}</p>
                  {change !== null && (
                    <p className={`text-[11px] ${change >= 0 ? "text-emerald-400" : "text-ocean-500"}`}>
                      {change >= 0 ? "+" : ""}
                      {change}% vs the 30 before
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {stats.daily.length > 1 && (
            <div className="flex h-16 items-end gap-0.5" aria-label="Daily views">
              {stats.daily.map((d) => (
                <span
                  key={d.day}
                  title={`${d.day}: ${d.n}`}
                  style={{ height: `${Math.max(6, (d.n / max) * 100)}%` }}
                  className="flex-1 rounded-sm bg-ocean-500/70"
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
