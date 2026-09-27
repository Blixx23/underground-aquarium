import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normaliseEmail } from "@/lib/email/address";
import { FROM_BULK } from "@/lib/email/provider";
import { dispatchOne, SITE } from "@/lib/email/queue";
import { letterShell, POSTAL, BRAND } from "@/lib/email/shell";
import { suppressedSet, suppress, unsuppress } from "@/lib/email/suppress";
import { claimToken } from "@/lib/stores/claimToken";

/**
 * Taking a shop off outreach, and bringing it back. One place, so the
 * admin button and the unsubscribe link can never drift apart.
 *
 * Opting out means: never email the address again, mark the shop's
 * contact so no campaign re-enrols it, stop every enrolment, cancel
 * anything waiting in the outbox, and send one plain confirmation.
 * The shop's page stays in the directory unless we're told to hide it.
 */

type Shop = { id: string; name: string; slug: string | null; claimed_by: string | null; status: string | null };

export type OptOutResult = {
  addresses: string[];
  shops: string[];
  stopped: number;
  cancelled: number;
  hidden: number;
  confirmed: string[];
  confirmFailed: string[];
};

/** "sales@x.com" matches itself, "%@x.com" matches the whole domain. */
async function findEverything(pattern: string) {
  const [{ data: contacts }, { data: enrolled }] = await Promise.all([
    supabaseAdmin.from("store_contacts").select("store_id, email").ilike("email", pattern),
    supabaseAdmin.from("email_campaign_enrollments").select("store_id, email").ilike("email", pattern),
  ]);
  const rows = [...(contacts ?? []), ...(enrolled ?? [])] as { store_id: string | null; email: string | null }[];
  const emails = new Set<string>();
  const storeIds = new Set<string>();
  for (const r of rows) {
    if (r.email) emails.add(normaliseEmail(r.email));
    if (r.store_id) storeIds.add(r.store_id);
  }
  let shops: Shop[] = [];
  if (storeIds.size) {
    const { data } = await supabaseAdmin
      .from("fish_stores")
      .select("id, name, slug, claimed_by, status")
      .in("id", [...storeIds]);
    shops = (data ?? []) as Shop[];
  }
  return { emails, shops };
}

async function replyTo(): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from("email_campaigns")
    .select("reply_to")
    .eq("audience", "unclaimed_shops")
    .not("reply_to", "is", null)
    .limit(1)
    .maybeSingle();
  return (data as { reply_to: string | null } | null)?.reply_to ?? undefined;
}

/** Just the fact: they're unsubscribed. Nothing about the listing. */
function confirmationEmail() {
  const p = (t: string) =>
    `<p style="margin:0 0 17px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.body};">${t}</p>`;
  const paragraphs = [
    "Hi,",
    "This is Chris from Underground Aquarium. You've been unsubscribed and won't get any more emails from us.",
    "Chris Lewis<br>Underground Aquarium",
  ];
  const html = letterShell({
    preheader: "You've been unsubscribed.",
    contentHtml:
      paragraphs.map(p).join("\n") +
      `<p style="margin:26px 0 0;border-top:1px solid ${BRAND.hair};padding-top:16px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">Underground Aquarium, ${POSTAL}</p>`,
  });
  return { subject: "You've been unsubscribed", html };
}

export async function optOut(opts: {
  /** An exact address, or "%@domain.com" for every address at a domain. */
  pattern: string;
  /** Always included, even if we hold no shop for it (e.g. a reply from a new address). */
  extraEmail?: string;
  hidePage?: boolean;
  confirm?: boolean;
  /** Only confirm addresses that weren't already off the list (the unsubscribe link can be clicked twice). */
  confirmNewOnly?: boolean;
  why?: string;
}): Promise<OptOutResult> {
  const now = new Date().toISOString();
  const { emails, shops } = await findEverything(opts.pattern);
  if (opts.extraEmail) emails.add(normaliseEmail(opts.extraEmail));
  const list = [...emails].filter(Boolean);
  const out: OptOutResult = { addresses: list, shops: shops.map((s) => s.name), stopped: 0, cancelled: 0, hidden: 0, confirmed: [], confirmFailed: [] };
  if (list.length === 0) return out;

  const already = opts.confirmNewOnly ? await suppressedSet(list) : new Set<string>();
  for (const e of list) await suppress(e, "unsubscribe", opts.why ?? "Asked to be removed from outreach");

  await supabaseAdmin.from("store_contacts").update({ unsubscribed_at: now }).in("email", list).is("unsubscribed_at", null);
  if (opts.pattern.startsWith("%@")) {
    await supabaseAdmin.from("store_contacts").update({ unsubscribed_at: now }).ilike("email", opts.pattern).is("unsubscribed_at", null);
  }

  const { data: stopped } = await supabaseAdmin
    .from("email_campaign_enrollments")
    .update({ status: "stopped", stop_reason: "unsubscribed", stopped_at: now })
    .in("email", list)
    .eq("status", "active")
    .select("id");
  out.stopped = stopped?.length ?? 0;

  const { data: cancelled } = await supabaseAdmin
    .from("email_queue")
    .update({ status: "failed", fail_reason: "other", last_error: "Removed from outreach at their request", locked_at: null })
    .in("to_email", list)
    .eq("status", "pending")
    .eq("bulk", true)
    .select("id");
  out.cancelled = cancelled?.length ?? 0;

  // Never hide a shop someone has claimed: that page belongs to its owner now.
  const hideable = opts.hidePage ? shops.filter((s) => !s.claimed_by && s.status === "published") : [];
  if (hideable.length) {
    const { data: hid, error } = await supabaseAdmin
      .from("fish_stores")
      .update({ status: "hidden" })
      .in("id", hideable.map((s) => s.id))
      .select("id");
    if (error) throw new Error(`Took them off the emails, but couldn't hide the page: ${error.message}. Has step 56 been run?`);
    out.hidden = hid?.length ?? 0;
    revalidatePath("/stores");
    for (const s of hideable) if (s.slug) revalidatePath(`/stores/${s.slug}`);
  }

  if (opts.confirm) {
    const reply = await replyTo();
    const { subject, html } = confirmationEmail();
    for (const to of list.slice(0, 5)) {
      if (already.has(to)) continue;
      try {
        await dispatchOne({
          kind: "optout_confirm",
          to,
          subject,
          html,
          from: FROM_BULK || undefined,
          replyTo: reply,
          confirmingOptOut: true,
          ignorePause: true,
          context: { shops: shops.map((s) => s.id) },
        });
        out.confirmed.push(to);
      } catch {
        out.confirmFailed.push(to);
      }
    }
  }
  return out;
}

export type RestoreResult = { shops: { name: string; url: string; claimLink: string }[]; unblocked: number };

/**
 * They changed their mind and want to claim. Put a hidden page back up,
 * let mail reach them again (they're about to get account email), and
 * hand back a one-press claim link to send them. Outreach stays off:
 * they're coming in on their own terms now.
 */
export async function restoreShop(pattern: string): Promise<RestoreResult> {
  const { emails, shops } = await findEverything(pattern);
  for (const e of emails) await unsuppress(e);
  const hidden = shops.filter((s) => s.status === "hidden");
  if (hidden.length) {
    const { error } = await supabaseAdmin.from("fish_stores").update({ status: "published" }).in("id", hidden.map((s) => s.id));
    if (error) throw new Error(error.message);
    revalidatePath("/stores");
    for (const s of hidden) if (s.slug) revalidatePath(`/stores/${s.slug}`);
  }
  return {
    unblocked: emails.size,
    shops: shops
      .filter((s) => s.slug)
      .map((s) => ({
        name: s.name,
        url: `${SITE}/stores/${s.slug}`,
        claimLink: `${SITE}/claim/${s.slug}?t=${claimToken(s.id)}`,
      })),
  };
}

/** Turn whatever was pasted into a pattern, or explain what's wrong. */
export function parseTarget(input: unknown): { pattern: string; email?: string } | { error: string } {
  const raw = String(input ?? "").trim().toLowerCase().replace(/^mailto:/, "");
  if (/^[^\s@]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw)) return { pattern: raw, email: raw };
  const domain = raw.replace(/^@/, "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    return { error: "Enter an email address, or a domain like reeflifeaquariums.com." };
  }
  // A shared mailbox provider is many shops, not one.
  if (/^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|comcast|att|sbcglobal|verizon|protonmail|proton|gmx|mail|zoho)\./.test(domain)) {
    return { error: `${domain} is shared by lots of shops. Enter their full email address instead.` };
  }
  return { pattern: `%@${domain}` };
}
