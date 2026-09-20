import type { Metadata } from "next";
import Link from "next/link";
import { FileStack, Plus, ArrowRight } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import {
  SPAWN_LOG_COLUMNS,
  STATUS_LABEL,
  STATUS_CLASS,
  type SpawnLog,
} from "@/lib/society/spawnLogs";
import { SOC_EYEBROW, SOC_BTN_PRIMARY } from "@/lib/society/theme";

export const metadata: Metadata = { title: "Spawn logs" };

export const dynamic = "force-dynamic";



export default async function SpawnLogsPage() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("spawn_logs")
    .select(SPAWN_LOG_COLUMNS)
    .eq("club_id", ctx.society!.id)
    .eq("user_id", ctx.userId)
    .order("opened_at", { ascending: false });

  const logs = ((data ?? []) as unknown as SpawnLog[]) ?? [];

  // One query for every log's stage count, rather than one per log.
  const counts = new Map<string, number>();
  if (logs.length > 0) {
    const { data: stageRows } = await supabase
      .from("spawn_log_stages")
      .select("log_id")
      .in("log_id", logs.map((l) => l.id));
    for (const r of (stageRows ?? []) as { log_id: string }[]) {
      counts.set(r.log_id, (counts.get(r.log_id) ?? 0) + 1);
    }
  }

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Breeder Award Program</p>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-white sm:text-3xl">
          Spawn logs
        </h1>
        <Link href="/society/breeder/new" className={`${SOC_BTN_PRIMARY} px-6`}>
          <Plus className="h-4 w-4" />
          Open a log
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 py-16 text-center">
          <FileStack className="mx-auto mb-4 h-9 w-9 text-ocean-700" />
          <p className="mb-1 text-lg text-ocean-200">No logs yet</p>
          <p className="mx-auto mb-6 max-w-sm text-sm text-ocean-500">
            Every species in the registry is unclaimed. The first member to log
            an approved spawn holds that record permanently.
          </p>
          <Link href="/society/breeder" className={`${SOC_BTN_PRIMARY} px-6`}>
            Pick a species
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => {
            const done = counts.get(l.id) ?? 0;
            return (
              <li key={l.id}>
                <Link
                  href={`/society/logs/${l.id}`}
                  className="group flex flex-wrap items-center gap-4 rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3 transition-colors hover:border-amber-500/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {l.species_name}
                      {l.is_first_in_society && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                          first in society
                        </span>
                      )}
                    </span>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-ocean-600">
                      {l.challenge_code} · opened{" "}
                      {new Date(l.opened_at).toLocaleDateString()}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block font-display text-base text-white">
                      {done}/5
                    </span>
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-ocean-600">
                      stages
                    </span>
                  </span>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium ${
                      STATUS_CLASS[l.status] ?? STATUS_CLASS.withdrawn
                    }`}
                  >
                    {STATUS_LABEL[l.status]}
                  </span>

                  <ArrowRight className="h-4 w-4 shrink-0 text-ocean-700 transition-all group-hover:translate-x-1 group-hover:text-amber-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
