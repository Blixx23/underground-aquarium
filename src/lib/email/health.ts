import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Everything the health function reports. Counts only; no addresses. */
export type EmailHealth = {
  checked_at: string;
  paused: boolean;
  bulk_paused: boolean;
  daily_bulk_cap: number;
  pending: number;
  stuck: number;
  sent_24h: number;
  failed_24h: number;
  failed_open: number;
  bulk_sent_today: number;
  delivered_7d: number;
  bounced_7d: number;
  complained_7d: number;
  opened_7d: number;
  suppressed: number;
  ever_sent: boolean;
};

export type HealthRead =
  | { ok: true; health: EmailHealth }
  | { ok: false; error: string };

export async function readHealth(): Promise<HealthRead> {
  const { data, error } = await supabaseAdmin.rpc("email_health");
  if (error) return { ok: false, error: error.message };
  return { ok: true, health: data as unknown as EmailHealth };
}

/**
 * One sentence for the top of the panel, and a colour to paint it.
 * "Nothing has ever sent" is deliberately not the same as "all clear":
 * a system that has never sent anything looks perfect right up until
 * you find out it never worked.
 */
export function verdict(h: EmailHealth): { tone: "bad" | "warn" | "ok" | "idle"; line: string } {
  if (!h.paused && h.stuck > 0) {
    return {
      tone: "bad",
      line: `Mail is not going out. ${h.stuck} message${h.stuck === 1 ? " has" : "s have"} been waiting more than 30 minutes, which means the worker isn't running.`,
    };
  }
  if (h.paused) {
    return {
      tone: "idle",
      line: `Everything is paused. ${h.pending} message${h.pending === 1 ? "" : "s"} waiting in the queue. Nothing sends until you turn sending on.`,
    };
  }
  if (!h.ever_sent) {
    return { tone: "warn", line: "Sending is on, but nothing has ever gone out. Send yourself a test to prove the path works." };
  }
  const rate = h.delivered_7d + h.bounced_7d;
  const bouncePct = rate > 0 ? (h.bounced_7d / rate) * 100 : 0;
  if (bouncePct >= 5) {
    return { tone: "bad", line: `${bouncePct.toFixed(1)}% of the last week bounced. Over 5% and mailbox providers start filtering you. Stop bulk sending and clean the list.` };
  }
  if (h.complained_7d > 0) {
    return { tone: "warn", line: `${h.complained_7d} spam complaint${h.complained_7d === 1 ? "" : "s"} this week. Keep an eye on it; a handful is normal, a trend is not.` };
  }
  if (h.failed_open > 0) {
    return { tone: "warn", line: `Sending is working. ${h.failed_open} message${h.failed_open === 1 ? "" : "s"} gave up and ${h.failed_open === 1 ? "is" : "are"} sitting in the failed list.` };
  }
  return { tone: "ok", line: `Sending is working. ${h.sent_24h} went out in the last 24 hours and nothing is stuck.` };
}
