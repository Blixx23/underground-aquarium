import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { opsConfigured } from "@/lib/ops/config";
import { WORKERS, WORKER_ORDER } from "@/lib/ops/workers";
import OpsConsole, { type OpsData } from "./OpsConsole";

export const metadata: Metadata = { title: "Admin · AI team" };
export const dynamic = "force-dynamic";

/**
 * The AI operating team: the latest brief, everything waiting on Chris,
 * each worker's switch and track record, the run log and what the team
 * remembers. The admin layout already restricts this to admins.
 */
/** One plain line on how a worker's latest run went: its report's opening line, or the error. */
function lastResult(run?: { status: string; report: string | null; error: string | null }): string | null {
  if (!run) return null;
  if (run.status === "error") return `Didn't finish: ${run.error ?? "unknown error"}`;
  // The first real sentence: skip headings and table rows.
  const line = (run.report ?? "")
    .split("\n")
    .filter((l) => !/^\s*(#|\|)/.test(l))
    .map((l) => l.replace(/^[>\-*\d.)\s]+/, "").replace(/\*\*/g, "").trim())
    .find((l) => l.length > 0);
  if (!line) return null;
  return line.length > 180 ? line.slice(0, 177) + "..." : line;
}

export default async function AdminOpsPage() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const findingCols =
    "id, worker_key, role, kind, risk, status, title, detail, suggested_action, evidence, link, reviewer_verdict, reviewer_note, rating, rating_note, github_issue_url, created_at, updated_at";

  const [settingsRes, workersRes, monthRunsRes, waitingRes, doneRes, dismissedRes, runsRes, memoryRes, briefRes] =
    await Promise.all([
      supabaseAdmin.from("ops_settings").select("enabled, monthly_cap_cents, brief_email").eq("id", 1).maybeSingle(),
      supabaseAdmin.from("ops_workers").select("key, enabled, last_run_at, last_status, running_since"),
      supabaseAdmin.from("ops_runs").select("worker_key, cost_cents").gte("started_at", monthStart.toISOString()),
      supabaseAdmin
        .from("ops_findings")
        .select(findingCols)
        .in("status", ["new", "open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("ops_findings")
        .select(findingCols)
        .in("status", ["fixed", "verified"])
        .gt("updated_at", since30)
        .order("updated_at", { ascending: false })
        .limit(40),
      supabaseAdmin
        .from("ops_findings")
        .select(findingCols)
        .eq("status", "dismissed")
        .gt("updated_at", since30)
        .order("updated_at", { ascending: false })
        .limit(40),
      supabaseAdmin
        .from("ops_runs")
        .select("id, worker_key, trigger, status, started_at, finished_at, queries, cost_cents, report, error, nothing_needed")
        .order("started_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("ops_memory")
        .select("id, worker_key, kind, content, source, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(300),
      supabaseAdmin
        .from("ops_runs")
        .select("id, worker_key, report, started_at, scorecard")
        .in("worker_key", ["morning", "weekly"])
        .eq("status", "done")
        .not("report", "is", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const setupMissing = Boolean(settingsRes.error) || !settingsRes.data;

  // Each worker's track record over 30 days, and how its latest run went.
  const [{ data: recent }, { data: lastRuns }] = setupMissing
    ? [{ data: [] }, { data: [] }]
    : await Promise.all([
        supabaseAdmin.from("ops_findings").select("worker_key, status, rating").gt("created_at", since30),
        supabaseAdmin
          .from("ops_runs")
          .select("worker_key, status, report, error, started_at")
          .in("status", ["done", "error"])
          .order("started_at", { ascending: false })
          .limit(100),
      ]);
  const latestByWorker = new Map<string, { status: string; report: string | null; error: string | null }>();
  for (const r of lastRuns ?? []) {
    if (!latestByWorker.has(r.worker_key)) latestByWorker.set(r.worker_key, r);
  }

  const spendByWorker: Record<string, number> = {};
  let spent = 0;
  for (const r of monthRunsRes.data ?? []) {
    const c = Number(r.cost_cents ?? 0);
    spent += c;
    spendByWorker[r.worker_key] = (spendByWorker[r.worker_key] ?? 0) + c;
  }

  const rows = new Map((workersRes.data ?? []).map((w) => [w.key as string, w]));
  const workers = WORKER_ORDER.map((key) => {
    const def = WORKERS[key];
    const row = rows.get(key);
    const mine = (recent ?? []).filter((f) => f.worker_key === key);
    const acted = mine.filter((f) => ["in_progress", "fixed", "verified"].includes(f.status) || f.rating === 1).length;
    return {
      key,
      name: def.name,
      schedule: def.schedule,
      model: def.model.includes("haiku") ? "Haiku" : "Sonnet",
      needsNote: def.needs ? def.needsNote ?? "Not connected yet." : null,
      about: def.about,
      lastResult: lastResult(latestByWorker.get(key)),
      enabled: Boolean(row?.enabled),
      lastRunAt: (row?.last_run_at as string | null) ?? null,
      lastStatus: (row?.last_status as string | null) ?? null,
      running: Boolean(row?.running_since && Date.now() - new Date(row.running_since as string).getTime() < 15 * 60_000),
      spentCents: spendByWorker[key] ?? 0,
      filed30: mine.length,
      acted30: acted,
    };
  });

  const data: OpsData = {
    setupMissing,
    configured: opsConfigured(),
    settings: {
      enabled: Boolean(settingsRes.data?.enabled),
      capCents: Number(settingsRes.data?.monthly_cap_cents ?? 5000),
      briefEmail: (settingsRes.data?.brief_email as string) ?? "",
    },
    spentCents: Math.round(spent * 100) / 100,
    workers,
    brief: briefRes.data
      ? {
          id: briefRes.data.id as string,
          workerKey: briefRes.data.worker_key as string,
          report: (briefRes.data.report as string) ?? "",
          startedAt: briefRes.data.started_at as string,
        }
      : null,
    waiting: (waitingRes.data ?? []) as OpsData["waiting"],
    done: (doneRes.data ?? []) as OpsData["done"],
    dismissed: (dismissedRes.data ?? []) as OpsData["dismissed"],
    runs: (runsRes.data ?? []) as OpsData["runs"],
    memory: (memoryRes.data ?? []) as OpsData["memory"],
  };

  return <OpsConsole data={data} />;
}
