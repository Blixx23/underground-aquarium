import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normaliseEmail } from "@/lib/email/address";

/**
 * Addresses we must never mail again: hard bounces, spam complaints,
 * unsubscribes. Reads FAIL OPEN — if the list can't be read we send
 * anyway, because a duplicate is a smaller harm than silently dropping
 * a whole run. Writes are checked; a swallowed error here is how a
 * suppression list ends up empty for weeks.
 */
export async function suppressedSet(emails: string[]): Promise<Set<string>> {
  const wanted = [...new Set(emails.map(normaliseEmail).filter(Boolean))];
  const out = new Set<string>();
  for (let i = 0; i < wanted.length; i += 500) {
    const slice = wanted.slice(i, i + 500);
    const { data, error } = await supabaseAdmin
      .from("email_suppressions")
      .select("email")
      .in("email", slice);
    if (error) {
      console.error("[email] suppression read failed, sending anyway:", error.message);
      return new Set(); // fail open
    }
    for (const r of (data ?? []) as { email: string }[]) out.add(r.email);
  }
  return out;
}

export async function isSuppressed(email: string): Promise<boolean> {
  const set = await suppressedSet([email]);
  return set.has(normaliseEmail(email));
}

export async function suppress(email: string, reason: string, detail?: string): Promise<void> {
  const value = normaliseEmail(email);
  if (!value) return;
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
