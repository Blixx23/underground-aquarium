import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { WorkerKey } from "@/lib/ops/workers";
import { listSupportEmails } from "@/lib/ops/gmail";

/**
 * The cheap check that runs before an agent wakes up: plain counts, no AI.
 * If nothing changed since the worker's last run, it stays asleep and the
 * day costs nothing.
 */

async function countSince(table: string, since: string, extra?: [string, string]): Promise<number> {
  try {
    let q = supabaseAdmin.from(table).select("id", { count: "exact", head: true }).gt("created_at", since);
    if (extra) q = q.eq(extra[0], extra[1]);
    const { count, error } = await q;
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
}

export async function hasNewActivity(key: WorkerKey, lastRunAt: string | null): Promise<{ wake: boolean; why: string }> {
  if (key === "reviewer") {
    const { count } = await supabaseAdmin
      .from("ops_findings")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    return { wake: (count ?? 0) > 0, why: `${count ?? 0} new findings to review` };
  }

  if (key === "support") {
    // New support mail that hasn't been handled yet.
    const recent = await listSupportEmails(7, 25);
    if (recent.length === 0) return { wake: false, why: "no support email this week" };
    const { data } = await supabaseAdmin
      .from("ops_support_seen")
      .select("message_id")
      .in("message_id", recent.map((m) => m.id));
    const handled = new Set((data ?? []).map((r) => r.message_id as string));
    const fresh = recent.filter((m) => !handled.has(m.id)).length;
    return { wake: fresh > 0, why: `${fresh} new support emails` };
  }

  if (!lastRunAt) return { wake: true, why: "first run" };

  if (key === "community") {
    const counts = await Promise.all([
      countSince("forum_threads", lastRunAt),
      countSince("forum_posts", lastRunAt),
      countSince("profiles", lastRunAt),
      countSince("tanks", lastRunAt),
      countSince("reports", lastRunAt),
      countSince("feed_posts", lastRunAt),
    ]);
    const total = counts.reduce((a, b) => a + b, 0);
    return { wake: total > 0, why: `${total} new posts, members, tanks or reports` };
  }

  return { wake: true, why: "scheduled" };
}
