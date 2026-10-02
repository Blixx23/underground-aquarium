import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { reviewIfDue, runWorker, type RunOutcome } from "@/lib/ops/runner";
import { OPS_LIMITS } from "@/lib/ops/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The AI team's schedule (see vercel.json):
 *   /api/cron/ops/morning       daily 6:30 am Pacific: the morning session, then the reviewer
 *   /api/cron/ops/activity      8 am, noon, 4 pm: Community Manager (only if there's news), then the reviewer
 *   /api/cron/ops/weekly        Monday 7 am: the weekly review
 *   /api/cron/ops/cmo           Monday 7:30 am: the week's marketing
 *   /api/cron/ops/partnerships  Tuesday 8 am: the shop pipeline
 *   /api/cron/ops/support       8:20 am, 12:20 pm, 4:20 pm: Support Desk (only if new support email)
 *   /api/cron/ops/qa            Wednesday 9 am: QA / Site Health
 * Each worker checks its own switch, the monthly cap and whether there's anything new.
 */
export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { job } = await params;
  const deadline = Date.now() + OPS_LIMITS.requestBudgetMs;
  const results: (RunOutcome | null)[] = [];

  switch (job) {
    case "morning":
      results.push(await runWorker("morning", "schedule", deadline));
      results.push(await reviewIfDue(deadline));
      break;
    case "activity":
      // The Community Manager works once a day at most; the reviewer whenever there's something new.
      results.push(await runWorker("community", "schedule", deadline));
      results.push(await reviewIfDue(deadline));
      break;
    case "weekly":
      results.push(await runWorker("weekly", "schedule", deadline));
      break;
    case "cmo":
      results.push(await runWorker("cmo", "schedule", deadline));
      results.push(await reviewIfDue(deadline));
      break;
    case "partnerships":
      results.push(await runWorker("partnerships", "schedule", deadline));
      results.push(await reviewIfDue(deadline));
      break;
    case "support":
      results.push(await runWorker("support", "schedule", deadline));
      results.push(await reviewIfDue(deadline));
      break;
    case "qa":
      results.push(await runWorker("qa", "schedule", deadline));
      results.push(await reviewIfDue(deadline));
      break;
    default:
      return NextResponse.json({ error: "Unknown job" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job, results: results.filter(Boolean) });
}
