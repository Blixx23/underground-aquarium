"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";

/** "Remind me to test": off, weekly or every two weeks. Reminders open Water Check. */
const CHOICES: { days: number | null; label: string }[] = [
  { days: null, label: "Off" },
  { days: 7, label: "Weekly" },
  { days: 14, label: "Every 2 weeks" },
];

export default function WaterReminder() {
  const [state, setState] = useState<{ days: number | null; signedIn: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/water-reminder")
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState({ days: null, signedIn: false }));
  }, []);

  if (!state) return null;

  async function choose(days: number | null) {
    if (saving || days === state!.days) return;
    setSaving(true);
    const prev = state!.days;
    setState({ ...state!, days });
    const res = await fetch("/api/water-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    }).catch(() => null);
    if (!res?.ok) setState({ ...state!, days: prev });
    setSaving(false);
  }

  return (
    <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm text-ocean-200">
        <BellRing className="h-4 w-4 text-emerald-400" />
        Remind me to test my water
      </span>
      {state.signedIn ? (
        <div className="flex gap-1.5">
          {CHOICES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => choose(c.days)}
              disabled={saving}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                state.days === c.days
                  ? "bg-emerald-500 text-ocean-950"
                  : "border border-ocean-700 text-ocean-300 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <Link href="/login?next=/water-check" className="text-sm text-emerald-300 hover:text-emerald-200">
          Sign in to turn on reminders
        </Link>
      )}
    </div>
  );
}
