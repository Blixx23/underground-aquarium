"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, Trash2 } from "lucide-react";
import { categoryLabel } from "@/lib/marketplace/categories";
import AlertMeButton from "@/components/marketplace/AlertMeButton";

type Alert = {
  id: string;
  query: string | null;
  category: string | null;
  place_label: string;
  radius_miles: number;
  include_wanted: boolean;
  active: boolean;
  created_at: string;
  last_hit_at: string | null;
};

function when(iso: string | null): string {
  if (!iso) return "No matches yet";
  return `Last match ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** The member's saved alerts, with pause, resume and remove. */
export default function MyAlerts() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/marketplace/alerts", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Couldn't load your alerts.");
      setAlerts([]);
    } else setAlerts(json.alerts ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function change(id: string, req: () => Promise<Response>) {
    setBusy(id);
    setError(null);
    const res = await req();
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? "Something went wrong.");
    await load();
    setBusy(null);
  }

  if (alerts === null) {
    return (
      <p className="flex items-center gap-2 text-ocean-200">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your alerts...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-100">{error}</p>}

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 p-10 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-ocean-500" />
          <p className="mb-1 text-lg text-white">No alerts yet</p>
          <p className="mb-5 text-sm text-ocean-300">Tell us what you&apos;re after and we&apos;ll let you know when it&apos;s posted near you.</p>
          <AlertMeButton label="Make an alert" />
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li key={a.id} className={`rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 ${a.active ? "" : "opacity-70"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white">
                      {a.query ? `"${a.query}"` : "Everything"}
                      {a.category ? ` in ${categoryLabel(a.category)}` : ""}
                    </p>
                    <p className="text-sm text-ocean-200">
                      Within {a.radius_miles} miles of {a.place_label}
                      {a.include_wanted ? ", including Wanted posts" : ""}
                    </p>
                    <p className="mt-1 text-xs text-ocean-300">
                      {a.active ? "On" : "Paused"} · {when(a.last_hit_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        change(a.id, () =>
                          fetch("/api/marketplace/alerts", {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ id: a.id, active: !a.active }),
                          })
                        )
                      }
                      className="rounded-full border border-ocean-700 px-3 py-1.5 text-sm text-ocean-100 hover:border-emerald-500 disabled:opacity-50"
                    >
                      {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : a.active ? "Pause" : "Turn on"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => change(a.id, () => fetch(`/api/marketplace/alerts?id=${encodeURIComponent(a.id)}`, { method: "DELETE" }))}
                      aria-label="Remove this alert"
                      className="rounded-full border border-ocean-700 p-2 text-ocean-300 hover:border-coral-400 hover:text-coral-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <AlertMeButton label="Add another alert" />
            <Link href="/marketplace" className="text-sm text-ocean-200 underline-offset-4 hover:text-white hover:underline">
              Browse classifieds
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
