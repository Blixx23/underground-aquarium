import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SOCIETY_SLUG } from "@/lib/config";
import { ADMIN_SECTIONS, type Queue } from "@/lib/admin/sections";

/**
 * How many things are waiting on an admin. Every queue comes from
 * ADMIN_SECTIONS (lib/admin/sections.ts), so a queue added there is counted
 * here, badged in the menu, shown on the dashboard and handed to the AI
 * team's morning session without touching this file.
 *
 * A table or column that doesn't exist counts as zero rather than breaking
 * the admin area.
 */
export type PendingCounts = Record<string, number>;

export type QueueStatus = {
  label: string;
  /** The menu item it belongs to. */
  section: string;
  /** Where it's handled. */
  href: string;
  count: number;
  /** Hours the oldest waiting item has been waiting, when known. */
  oldestHours: number | null;
};

const societyId = cache(async (): Promise<string | null> => {
  const { data } = await supabaseAdmin.from("clubs").select("id").eq("slug", SOCIETY_SLUG).maybeSingle();
  return (data?.id as string | undefined) ?? null;
});

// Loose typing on purpose: each queue names its own table and columns.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filtered(q: any, queue: Queue, society: string | null) {
  for (const [col, value] of queue.where ?? []) q = q.eq(col, value);
  if (queue.whereIn) q = q.in(queue.whereIn[0], queue.whereIn[1]);
  if (queue.society) q = q.eq("club_id", society);
  return q;
}

async function measure(queue: Queue, society: string | null, withAge: boolean): Promise<{ count: number; oldestHours: number | null }> {
  if (queue.society && !society) return { count: 0, oldestHours: null };
  try {
    const { count, error } = await filtered(
      supabaseAdmin.from(queue.table).select("id", { count: "exact", head: true }),
      queue,
      society
    );
    if (error) return { count: 0, oldestHours: null };
    const n = count ?? 0;
    if (!withAge || n === 0) return { count: n, oldestHours: null };

    const col = queue.since ?? "created_at";
    const { data } = await filtered(supabaseAdmin.from(queue.table).select(col), queue, society)
      .order(col, { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const at = data?.[col] as string | null | undefined;
    const oldestHours = at ? Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 3_600_000)) : null;
    return { count: n, oldestHours };
  } catch {
    return { count: 0, oldestHours: null };
  }
}

async function measureAll(withAge: boolean): Promise<QueueStatus[]> {
  const society = await societyId();
  const jobs = ADMIN_SECTIONS.flatMap((s) =>
    (s.queues ?? []).map(async (q): Promise<QueueStatus> => {
      const m = await measure(q, society, withAge);
      return { label: q.label, section: s.href, href: q.href ?? s.href, ...m };
    })
  );
  return Promise.all(jobs);
}

/** Every queue with its count (and, for the AI team, how long the oldest item has waited). */
export const queueStatus = cache(async (withAge = false): Promise<QueueStatus[]> => measureAll(withAge));

/** Waiting counts keyed by menu item, for badges and the dashboard. */
export const adminPending = cache(async (): Promise<PendingCounts> => {
  const out: PendingCounts = {};
  for (const q of await queueStatus(false)) out[q.section] = (out[q.section] ?? 0) + q.count;
  return out;
});
