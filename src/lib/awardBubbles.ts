import { supabaseAdmin } from "@/lib/supabase/admin";
import { bubbleTier } from "@/lib/bubbles";
import { sendEmail, tierUpEmail } from "@/lib/email";

// Notify the earner in-app only for meaningful grants (a +1 daily login would
// be spam). Tier-ups always notify, regardless of the triggering amount.
const NOTIFY_MIN = 10;

/**
 * Grant bubbles for a named source, server-side only. Safe to call freely:
 * - the amount is fixed by bubble_rules (callers can't forge it),
 * - it's idempotent per (user, dedupeKey) so it can't double-grant,
 * - it never throws; on any problem it returns 0.
 *
 * Pass a dedupeKey for anything that can recur (e.g. `daily_2026_06_22`,
 * `sale_<orderId>`, `posts_10`). Omit it for true once-per-user awards.
 */
export async function awardBubbles(
  userId: string | null | undefined,
  source: string,
  dedupeKey?: string
): Promise<number> {
  if (!userId) return 0;
  try {
    const { data: before } = await supabaseAdmin
      .from("profiles")
      .select("bubble_balance, username")
      .eq("id", userId)
      .maybeSingle();
    const beforeBal = (before?.bubble_balance as number) ?? 0;

    const { data, error } = await supabaseAdmin.rpc("award_bubbles", {
      p_user_id: userId,
      p_source: source,
      p_dedupe_key: dedupeKey ?? null,
    });
    if (error) return 0;

    const result = (data ?? {}) as { amount?: number; label?: string | null };
    const amount = result.amount ?? 0;
    if (amount <= 0) return 0; // duplicate or unknown source — nothing happened

    const { data: after } = await supabaseAdmin
      .from("profiles")
      .select("bubble_balance")
      .eq("id", userId)
      .maybeSingle();
    const afterBal = (after?.bubble_balance as number) ?? beforeBal + amount;
    const uname = (before?.username as string | null) ?? null;
    const link = uname ? `/u/${uname}` : null;

    // In-app notice for meaningful earns.
    if (amount >= NOTIFY_MIN) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "bubbles",
          title: "You earned bubbles",
          body: `+${amount} bubbles — ${result.label ?? "reward"}`,
          link,
        });
      } catch {
        // ignore
      }
    }

    // Tier-up (atomic claim shared with the vote/award paths).
    const afterTier = bubbleTier(afterBal);
    if (afterTier.rank > bubbleTier(beforeBal).rank) {
      const { data: claimed } = await supabaseAdmin.rpc("claim_bubble_tier", {
        p_user_id: userId,
        p_rank: afterTier.rank,
      });
      if (claimed) {
        try {
          await supabaseAdmin.from("notifications").insert({
            user_id: userId,
            type: "bubbles",
            title: `New tier: ${afterTier.name}`,
            body: `Your bubbles carried you into ${afterTier.name}. Keep it up!`,
            link,
          });
        } catch {
          // ignore
        }
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
            userId
          );
          const to = authUser?.user?.email ?? null;
          if (to) {
            const t = tierUpEmail({
              tierName: afterTier.name,
              balance: afterBal,
              username: uname,
            });
            await sendEmail({ to, subject: t.subject, html: t.html });
          }
        } catch {
          // ignore
        }
      }
    }

    return amount;
  } catch {
    return 0;
  }
}
