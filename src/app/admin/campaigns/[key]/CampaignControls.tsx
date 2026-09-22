"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, FlaskConical, Plus, Zap } from "lucide-react";

type Result = { enrolled?: number; stopped?: number; queued?: number; finished?: number; budget?: number; error?: string };

async function post(payload: Record<string, unknown>): Promise<Result> {
  const res = await fetch("/api/admin/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as Result;
}

/** Turn the campaign on, see what a run would do, or force one. */
export default function CampaignControls({
  campaignKey,
  active,
  repeatDays,
}: {
  campaignKey: string;
  active: boolean;
  repeatDays: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [every, setEvery] = useState(String(repeatDays ?? 0));

  async function run(key: string, payload: Record<string, unknown>, ok: (r: Result) => string) {
    setBusy(key);
    setNote(null);
    const r = await post(payload);
    setBusy(null);
    if (r.error) setNote({ tone: "bad", text: r.error });
    else {
      setNote({ tone: "ok", text: ok(r) });
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            run("toggle", { action: "toggle", key: campaignKey, active: !active }, () =>
              active ? "Campaign turned off. Nobody new will be added." : "Campaign is on."
            )
          }
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40 ${
            active
              ? "border border-ocean-700 text-ocean-200 hover:text-white"
              : "bg-emerald-500 text-ocean-950 hover:bg-emerald-400"
          }`}
        >
          {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {active ? "Turn the campaign off" : "Turn the campaign on"}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            run("dry", { action: "dry-run", key: campaignKey }, (r) =>
              `A run right now would add ${r.enrolled ?? 0} shops, drop ${r.stopped ?? 0}, and send ${r.queued ?? 0} emails today.`
            )
          }
          className="inline-flex items-center gap-2 rounded-full border border-ocean-700 px-4 py-2 text-sm text-ocean-200 hover:text-white disabled:opacity-40"
        >
          <FlaskConical className="h-4 w-4" /> What would a run do?
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            run("run", { action: "run-now", key: campaignKey }, (r) =>
              `Added ${r.enrolled ?? 0}, dropped ${r.stopped ?? 0}, queued ${r.queued ?? 0}. The queue sends them, subject to the pause switch and the daily cap.`
            )
          }
          className="inline-flex items-center gap-2 rounded-full border border-ocean-700 px-4 py-2 text-sm text-ocean-200 hover:text-white disabled:opacity-40"
        >
          <Zap className="h-4 w-4" /> Run it now
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("add", { action: "add-step", key: campaignKey }, () => "Added an email at the end, turned off until you finish it.")}
          className="inline-flex items-center gap-2 rounded-full border border-ocean-800 px-4 py-2 text-sm text-ocean-400 hover:text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add another email
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-ocean-800/60 bg-ocean-950/40 px-4 py-3">
        <label htmlFor="every" className="text-sm text-ocean-300">
          Write to each shop every
        </label>
        <input
          id="every"
          type="number"
          min={0}
          max={365}
          value={every}
          onChange={(e) => setEvery(e.target.value)}
          className="w-20 rounded-lg border border-ocean-700 bg-ocean-900 px-3 py-1.5 text-sm text-white"
        />
        <span className="text-sm text-ocean-300">days</span>
        <button
          type="button"
          disabled={busy !== null || every === String(repeatDays ?? 0)}
          onClick={() =>
            run("interval", { action: "set-interval", key: campaignKey, repeatDays: Number(every) }, () =>
              Number(every) > 0
                ? `They'll hear from you every ${Number(every)} days until they claim or opt out.`
                : "Repeating turned off. Each shop gets it once."
            )
          }
          className="rounded-lg border border-ocean-700 px-3 py-1.5 text-sm text-ocean-200 hover:text-white disabled:opacity-40"
        >
          Save
        </button>
        <span className="w-full text-[11px] text-ocean-500 sm:w-auto sm:pl-2">
          0 means send it once and stop.
        </span>
      </div>

      {note && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            note.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
