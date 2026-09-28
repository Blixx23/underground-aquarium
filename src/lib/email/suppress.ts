import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normaliseEmail } from "@/lib/email/address";

/**
 * The do-not-email list.
 *
 * Not every entry means the same thing. The reason stored on each row
 * decides how far the block reaches:
 *
 *   - "bounce", "invalid", "manual": the address doesn't work (or an
 *     admin blocked it on purpose), so NOTHING goes to it.
 *   - "unsubscribe", "complaint": the person said no to marketing and
 *     outreach. Their account email, message alerts, dues reminders and
 *     receipts still arrive, because those are mail they need.
 *
 * No extra column is needed: the reason already tells us which it is.
 *
 * Reads FAIL OPEN: if the list can't be read we send anyway, because a
 * duplicate is a smaller harm than silently dropping a whole run. Writes
 * are checked; a swallowed error here is how a suppression list ends up
 * empty for weeks.
 */

/** How far a suppression reaches. */
export type SuppressionScope = "all" | "marketing";

/** Which kind of mail a send is, for deciding whether a block applies. */
export type MailCategory = "marketing" | "transactional";

/** Reasons that only stop marketing and outreach mail. */
const MARKETING_ONLY = new Set(["unsubscribe", "complaint"]);

/** Anything we don't recognise blocks everything, the safe direction. */
export function scopeOf(reason: string | null | undefined): SuppressionScope {
  return MARKETING_ONLY.has(String(reason ?? "")) ? "marketing" : "all";
}

/**
 * Is this send marketing? Bulk mail (campaigns, shop outreach, campaign
 * tests) is marketing, and so is anything whose kind starts with
 * "campaign", in case a campaign row was ever queued without the flag.
 * Everything else is transactional mail a member needs.
 */
export function categoryOf(row: { bulk?: boolean | null; kind?: string | null }): MailCategory {
  if (row.bulk) return "marketing";
  if (String(row.kind ?? "").startsWith("campaign")) return "marketing";
  return "transactional";
}

/** Does a suppression with this reason block this kind of mail? */
export function blocks(reason: string | null | undefined, category: MailCategory): boolean {
  return scopeOf(reason) === "all" || category === "marketing";
}

/** Every listed address among these, with the reason it was listed. */
export async function suppressionReasons(emails: string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(emails.map(normaliseEmail).filter(Boolean))];
  const out = new Map<string, string>();
  for (let i = 0; i < wanted.length; i += 500) {
    const slice = wanted.slice(i, i + 500);
    const { data, error } = await supabaseAdmin
      .from("email_suppressions")
      .select("email, reason")
      .in("email", slice);
    if (error) {
      console.error("[email] suppression read failed, sending anyway:", error.message);
      return new Map(); // fail open
    }
    for (const r of (data ?? []) as { email: string; reason: string | null }[]) out.set(r.email, r.reason ?? "");
  }
  return out;
}

/**
 * The addresses among these that must not get this kind of mail.
 * "any" means listed for any reason at all (used to tell whether
 * someone was already on the list).
 */
export async function suppressedSet(
  emails: string[],
  category: MailCategory | "any" = "any"
): Promise<Set<string>> {
  const reasons = await suppressionReasons(emails);
  const out = new Set<string>();
  for (const [email, reason] of reasons) {
    if (category === "any" || blocks(reason, category)) out.add(email);
  }
  return out;
}

export async function isSuppressed(email: string, category: MailCategory | "any" = "any"): Promise<boolean> {
  const set = await suppressedSet([email], category);
  return set.has(normaliseEmail(email));
}

export async function suppress(email: string, reason: string, detail?: string): Promise<void> {
  const value = normaliseEmail(email);
  if (!value) return;

  // Never weaken a block. If an address already bounced, a later
  // unsubscribe click must not turn "send nothing" into "marketing only",
  // or account mail would start going to a dead address again.
  if (scopeOf(reason) === "marketing") {
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("email_suppressions")
      .select("reason")
      .eq("email", value)
      .maybeSingle();
    if (readErr) console.error("[email] could not read existing suppression:", readErr.message);
    const had = (existing as { reason: string | null } | null)?.reason;
    if (had && scopeOf(had) === "all") return;
  }

  const { error } = await supabaseAdmin
    .from("email_suppressions")
    .upsert({ email: value, reason, detail: detail?.slice(0, 500) ?? null }, { onConflict: "email" });
  if (error) console.error("[email] could not record suppression:", error.message);
}

export async function unsuppress(email: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("email_suppressions")
    .delete()
    .eq("email", normaliseEmail(email));
  if (error) throw new Error(error.message);
}

/** The words the worker writes on a row it refused to send. */
export const SKIPPED_PREFIX = "Not sent:";

export function skippedMessage(reason: string): string {
  return scopeOf(reason) === "all"
    ? `${SKIPPED_PREFIX} this address is on the do-not-email list (${reason}), so nothing can go to it.`
    : `${SKIPPED_PREFIX} this person opted out of marketing and outreach email (${reason}).`;
}
