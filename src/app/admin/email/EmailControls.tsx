"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Send, RefreshCw } from "lucide-react";

type Props = {
  paused: boolean;
  bulkPaused: boolean;
  dailyBulkCap: number;
  myEmail: string;
};

async function call(payload: Record<string, unknown>): Promise<{ ok?: boolean; error?: string } & Record<string, unknown>> {
  const res = await fetch("/api/admin/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as { ok?: boolean; error?: string };
}

/**
 * The switches. Sending is off by default and stays off until it's turned
 * on here, so a mistake in a campaign can't leak out on its own.
 */
export default function EmailControls({ paused, bulkPaused, dailyBulkCap, myEmail }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [working, setWorking] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [cap, setCap] = useState(String(dailyBulkCap));

  async function run(key: string, payload: Record<string, unknown>, ok: (r: Record<string, unknown>) => string) {
    setWorking(key);
    setNote(null);
    const r = await call(payload);
    setWorking(null);
    if (r.error) setNote({ tone: "bad", text: r.error });
    else {
      setNote({ tone: "ok", text: ok(r) });
      startTransition(() => router.refresh());
    }
  }

  const disabled = busy || working !== null;

  return (
    <section className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <h2 className="mb-1 font-medium text-white">Controls</h2>
      <p className="mb-4 text-sm text-ocean-400">
        Nothing leaves the site while sending is off. Queued mail waits and goes out in order when you turn it back on.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Master switch */}
        <div className="rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-4">
          <p className="text-sm font-medium text-white">All email</p>
          <p className="mt-0.5 mb-3 text-xs text-ocean-400">
            {paused ? "Off. Everything queues up and waits." : "On. The worker sends every two minutes."}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              run("paused", { action: "settings", paused: !paused }, () =>
                paused ? "Sending is on." : "Sending is off. Nothing will go out."
              )
            }
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              paused
                ? "bg-emerald-500 text-ocean-950 hover:bg-emerald-400"
                : "border border-ocean-700 text-ocean-200 hover:text-white"
            }`}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? "Turn sending on" : "Pause everything"}
          </button>
        </div>

        {/* Bulk switch */}
        <div className="rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-4">
          <p className="text-sm font-medium text-white">Bulk and outreach</p>
          <p className="mt-0.5 mb-3 text-xs text-ocean-400">
            {bulkPaused
              ? "Off. Receipts and alerts still send; campaigns don't."
              : "On. Campaign mail sends up to the daily cap."}
          </p>
          <button
            type="button"
            disabled={disabled || paused}
            onClick={() =>
              run("bulk", { action: "settings", bulkPaused: !bulkPaused }, () =>
                bulkPaused ? "Bulk mail is on." : "Bulk mail is paused."
              )
            }
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              bulkPaused
                ? "bg-amber-400 text-ocean-950 hover:bg-amber-300"
                : "border border-ocean-700 text-ocean-200 hover:text-white"
            }`}
          >
            {bulkPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {bulkPaused ? "Allow bulk mail" : "Pause bulk mail"}
          </button>
          {paused && <p className="mt-2 text-[11px] text-ocean-500">Turn all email on first.</p>}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Daily cap */}
        <div className="rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-4">
          <label htmlFor="cap" className="text-sm font-medium text-white">
            Bulk sends per day
          </label>
          <p className="mt-0.5 mb-3 text-xs text-ocean-400">
            Keep it low while the sending domain is new. Anything over the cap waits for tomorrow.
          </p>
          <div className="flex gap-2">
            <input
              id="cap"
              type="number"
              min={0}
              max={5000}
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              className="w-24 rounded-lg border border-ocean-700 bg-ocean-900 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={disabled || cap === String(dailyBulkCap)}
              onClick={() => run("cap", { action: "settings", dailyBulkCap: Number(cap) }, () => `Cap set to ${Number(cap)} a day.`)}
              className="rounded-lg border border-ocean-700 px-3 py-2 text-sm text-ocean-200 hover:text-white disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>

        {/* Test and manual run */}
        <div className="rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-4">
          <p className="text-sm font-medium text-white">Check it works</p>
          <p className="mt-0.5 mb-3 text-xs text-ocean-400">
            The test ignores the pause switch, so you can prove the path before you turn anything on.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => run("test", { action: "test", email: myEmail }, (r) => `Test sent to ${String(r.to ?? myEmail)}.`)}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Send me a test
            </button>
            <button
              type="button"
              disabled={disabled || paused}
              onClick={() =>
                run("run", { action: "run" }, (r) => `Ran the worker: ${Number(r.sent ?? 0)} sent, ${Number(r.failed ?? 0)} failed.`)
              }
              className="inline-flex items-center gap-2 rounded-full border border-ocean-700 px-4 py-2 text-sm text-ocean-200 hover:text-white disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${working === "run" ? "animate-spin" : ""}`} /> Run the queue now
            </button>
          </div>
        </div>
      </div>

      {note && (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            note.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {note.text}
        </p>
      )}
    </section>
  );
}
