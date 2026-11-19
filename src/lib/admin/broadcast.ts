import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Who a "Notify members" send reaches: every member who isn't deleted or
 * suspended and hasn't switched Site news off under the bell. Read in pages
 * so it holds past 1,000 members.
 */
export async function broadcastRecipients(): Promise<string[]> {
  const ids: string[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, muted_notifications")
      .is("deleted_at", null)
      .is("suspended_at", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string; muted_notifications: string[] | null }[];
    for (const r of rows) if (!(r.muted_notifications ?? []).includes("site")) ids.push(r.id);
    if (rows.length < PAGE) break;
  }
  return ids;
}
