import "server-only";
import type { WorkerDef } from "@/lib/ops/workers";

/**
 * What a worker still needs connected before it can run, or null when it's
 * ready. No worker needs extra setup right now; the hook stays so the team
 * page and runner have one place to ask.
 */
export function setupNote(_w: WorkerDef): string | null {
  return null;
}
