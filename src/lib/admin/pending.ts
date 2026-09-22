import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SOCIETY_SLUG, SOCIETY_CLUB_PATH } from "@/lib/config";

/**
 * How many things are waiting on an admin, keyed by the page that handles
 * them. The layout uses it for the nav badges and the dashboard uses it for
 * the cards, so it's wrapped in cache(): one render, one set of queries.
 *
 * A table that doesn't exist yet counts as zero rather than breaking the
 * whole admin area.
 */
export type PendingCounts = Record<string, number>;

type Filter = [column: string, value: string | boolean];

async function countWhere(table: string, filters: Filter[], anyOf?: [string, string[]]): Promise<number> {
  try {
    let q = supabaseAdmin.from(table).select("id", { count: "exact", head: true });
    for (const [col, value] of filters) q = q.eq(col, value);
    if (anyOf) q = q.in(anyOf[0], anyOf[1]);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export const adminPending = cache(async (): Promise<PendingCounts> => {
  const { data: society } = await supabaseAdmin
    .from("clubs")
    .select("id")
    .eq("slug", SOCIETY_SLUG)
    .maybeSingle();

  const [members, courses, species, glossary, claims, fixes, reports, feedback, emailFailed] =
    await Promise.all([
      society ? countWhere("club_members", [["club_id", society.id as string], ["status", "pending"]]) : 0,
      countWhere("courses", [["is_published", false]]),
      countWhere("species_suggestions", [["status", "pending"]]),
      countWhere("glossary_suggestions", [["status", "pending"]]),
      countWhere("store_claims", [["status", "pending"]]),
      countWhere("store_edit_suggestions", [["status", "open"]]),
      countWhere("reports", [["status", "open"]]),
      countWhere("feedback", [], ["status", ["new", "in_progress"]]),
      countWhere("email_queue", [["status", "failed"]]),
    ]);

  return {
    [`${SOCIETY_CLUB_PATH}/admin`]: members,
    "/admin/courses": courses,
    "/admin/species": species,
    "/admin/glossary": glossary,
    "/admin/stores": claims,
    "/admin/store-fixes": fixes,
    "/admin/reports": reports,
    "/admin/feedback": feedback,
    "/admin/email": emailFailed,
  };
});
