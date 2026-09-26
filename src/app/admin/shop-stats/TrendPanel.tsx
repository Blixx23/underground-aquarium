"use client";

import { useState } from "react";
import DayBars from "@/components/stats/DayBars";

type Day = { day: string; views: number; actions: number };

/** Views or people heading to shops, day by day, across the whole directory. */
export default function TrendPanel({ daily }: { daily: Day[] }) {
  const [which, setWhich] = useState<"views" | "actions">("views");
  const tab = (k: "views" | "actions") =>
    `rounded-lg px-3 py-1.5 text-sm transition-colors ${
      which === k ? "bg-sky-500/20 text-white ring-1 ring-sky-400/40" : "text-ocean-400 hover:text-white"
    }`;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-white">Day by day, all shops</p>
        <div role="tablist" className="flex gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
          <button type="button" role="tab" aria-selected={which === "views"} onClick={() => setWhich("views")} className={tab("views")}>
            Page views
          </button>
          <button type="button" role="tab" aria-selected={which === "actions"} onClick={() => setWhich("actions")} className={tab("actions")}>
            Heading to shops
          </button>
        </div>
      </div>
      <DayBars
        key={which}
        points={daily.map((d) => ({ day: d.day, value: which === "views" ? d.views : d.actions }))}
        unit={which === "views" ? "page views" : "directions, calls and website taps"}
      />
    </div>
  );
}
