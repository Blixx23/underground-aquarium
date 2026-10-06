import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Right now, not at the next campaign run: stop every shop email going to
 * these shops. Used when a shop is hidden or moved to the Wholesale list.
 *
 * It stops their campaign enrolments and cancels any outreach already
 * sitting in the outbox for their addresses. It does NOT put them on the
 * do-not-email list, so a wholesaler can still be pitched as a supplier
 * later, and account or message email still reaches an owner.
 */
export async function stopShopOutreach(storeIds: string[], why: string): Promise<{ stopped: number; cancelled: number }> {
  const ids = storeIds.filter(Boolean);
  if (ids.length === 0) return { stopped: 0, cancelled: 0 };
  const now = new Date().toISOString();

  // Campaign enrolments. Newer databases know the reason "hidden";
  // older ones only the original reasons, so fall back to "unsubscribed".
  let stopped = 0;
  const first = await supabaseAdmin
    .from("email_campaign_enrollments")
    .update({ status: "stopped", stop_reason: "hidden", stopped_at: now })
    .in("store_id", ids)
    .eq("status", "active")
    .select("id");
  if (first.error) {
    const again = await supabaseAdmin
      .from("email_campaign_enrollments")
      .update({ status: "stopped", stop_reason: "unsubscribed", stopped_at: now })
      .in("store_id", ids)
      .eq("status", "active")
      .select("id");
    stopped = again.data?.length ?? 0;
  } else {
    stopped = first.data?.length ?? 0;
  }

  // Outreach already queued to their addresses.
  const { data: contacts } = await supabaseAdmin
    .from("store_contacts")
    .select("email")
    .in("store_id", ids)
    .not("email", "is", null);
  const emails = [...new Set(((contacts ?? []) as { email: string }[]).map((c) => c.email.trim().toLowerCase()))];
  let cancelled = 0;
  if (emails.length) {
    const { data } = await supabaseAdmin
      .from("email_queue")
      .update({ status: "failed", fail_reason: "other", last_error: why, locked_at: null, cleared_at: new Date().toISOString() })
      .in("to_email", emails)
      .eq("status", "pending")
      .eq("bulk", true)
      .select("id");
    cancelled = data?.length ?? 0;
  }
  return { stopped, cancelled };
}
