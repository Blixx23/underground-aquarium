import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchOne } from "@/lib/email/queue";

/**
 * What "Yes" does on an AI team finding.
 *
 * Workers attach a proposal when they file a finding: an email the site can
 * send for Chris, a fix Claude can make, or a plan to approve. Chris can edit
 * it, then answer Yes, No or Something else. Nothing happens without his Yes.
 */

export type Proposal =
  | { type: "email"; subject: string; body: string; store_ids: string[] }
  | { type: "fix" }
  | { type: "approve" };

export type ProposalKind = Proposal["type"] | "done";

/** The proposal a finding carries, or the sensible one for its kind. */
export function proposalFor(kind: string, raw: unknown, github: boolean): { kind: ProposalKind; proposal: Proposal | null } {
  const p = raw as Partial<Proposal> | null;
  if (p && p.type === "email" && Array.isArray((p as { store_ids?: unknown }).store_ids)) {
    const e = p as Extract<Proposal, { type: "email" }>;
    if (e.subject && e.body && e.store_ids.length) return { kind: "email", proposal: e };
  }
  if ((p?.type === "fix" || kind === "bug") && github) return { kind: "fix", proposal: { type: "fix" } };
  // Only a plan the team said it can carry out itself is "approve". Anything else
  // needs Chris to do it, so Yes means "I've done it".
  if (p?.type === "approve") return { kind: "approve", proposal: { type: "approve" } };
  return { kind: "done", proposal: null };
}

/** Check a proposal from a worker before it's saved. */
export function cleanProposal(raw: unknown): Proposal | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (p.type === "email") {
    const ids = Array.isArray(p.store_ids) ? p.store_ids.filter((x): x is string => typeof x === "string").slice(0, 25) : [];
    const subject = typeof p.subject === "string" ? p.subject.trim().slice(0, 200) : "";
    const body = typeof p.body === "string" ? p.body.trim().slice(0, 5000) : "";
    return ids.length && subject && body ? { type: "email", subject, body, store_ids: ids } : null;
  }
  if (p.type === "fix") return { type: "fix" };
  if (p.type === "approve") return { type: "approve" };
  return null;
}

export type Recipient = { storeId: string; shop: string; email: string | null; firstName: string };

/** Who an email proposal goes to: the shop's claimed owner, or its listed contact. */
export async function recipientsFor(storeIds: string[]): Promise<Recipient[]> {
  if (!storeIds.length) return [];
  const { data: stores } = await supabaseAdmin.from("fish_stores").select("id, name, claimed_by").in("id", storeIds);
  const out: Recipient[] = [];
  for (const s of (stores ?? []) as { id: string; name: string; claimed_by: string | null }[]) {
    let email: string | null = null;
    let firstName = "there";
    if (s.claimed_by) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(s.claimed_by);
      email = u?.user?.email ?? null;
      const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", s.claimed_by).maybeSingle();
      const first = (prof?.full_name as string | null)?.trim().split(/\s+/)[0];
      if (first) firstName = first;
    }
    if (!email) {
      const { data: c } = await supabaseAdmin
        .from("store_contacts")
        .select("email")
        .eq("store_id", s.id)
        .is("unsubscribed_at", null)
        .not("email", "is", null)
        .limit(1);
      email = ((c ?? [])[0] as { email: string } | undefined)?.email ?? null;
    }
    out.push({ storeId: s.id, shop: s.name, email, firstName });
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fill = (t: string, r: Recipient) =>
  t.replace(/\{\{\s*shop_name\s*\}\}/g, r.shop).replace(/\{\{\s*owner_first_name\s*\}\}/g, r.firstName);

/** Send an approved email proposal, one personal email per shop. */
export async function sendEmailProposal(p: { subject: string; body: string; store_ids: string[] }, replyTo?: string) {
  const recipients = await recipientsFor(p.store_ids);
  let sent = 0;
  const skipped: string[] = [];
  for (const r of recipients) {
    if (!r.email) {
      skipped.push(`${r.shop} (no email on file)`);
      continue;
    }
    const text = fill(p.body, r);
    const html = text
      .split(/\n{2,}/)
      .map((para) => `<p>${esc(para).replace(/\n/g, "<br>")}</p>`)
      .join("");
    try {
      await dispatchOne({ kind: "ops_message", to: r.email, subject: fill(p.subject, r), html, replyTo, retryLater: true });
      sent++;
    } catch (e) {
      skipped.push(`${r.shop} (${e instanceof Error ? e.message : "couldn't send"})`);
    }
  }
  return { sent, skipped };
}
