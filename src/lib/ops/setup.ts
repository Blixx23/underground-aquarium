import "server-only";
import { gmailConfigured } from "@/lib/ops/gmail";
import type { WorkerDef } from "@/lib/ops/workers";

/** What a worker still needs connected before it can run, or null when it's ready. */
export function setupNote(w: WorkerDef): string | null {
  if (w.needs === "gmail" && !gmailConfigured()) return w.needsNote ?? "Needs Gmail connected.";
  return null;
}
