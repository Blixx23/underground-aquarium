import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailLayout } from "@/lib/email";
import { dispatchOne, SITE } from "@/lib/email/queue";
import { DEFAULT_EMAIL_OFF, groupFor, NOTIFICATION_GROUPS, type DigestChoice } from "@/lib/notificationGroups";

/**
 * Email for bell notifications, so members come back when something
 * happens. Members pick per category whether it's emailed, and how often.
 * Only notices still unread after a few minutes are emailed, so anyone
 * already on the site isn't emailed about what they just saw.
 */

const SHOP_TYPES = ["shop_review", "shop_fix", "shop_milestone", "shop_weekly"]; // the shop-alerts job emails these
const WAIT_MINUTES = 10; // give people on the site a chance to see it first
const BUNDLE_GAP_MIN = 60; // at most one bundled email an hour
const MAX_AGE_DAYS = 3; // never email about something old
const DAILY_HOUR = 8; // Pacific

export type EmailPrefs = { off: string[]; digest: DigestChoice };

export async function emailPrefs(userId: string): Promise<EmailPrefs> {
  const { data } = await supabaseAdmin.from("profiles").select("email_off, email_digest").eq("id", userId).maybeSingle();
  const row = data as { email_off?: string[] | null; email_digest?: string | null } | null;
  return {
    off: row?.email_off ?? DEFAULT_EMAIL_OFF,
    digest: (["bundled", "daily", "off"].includes(String(row?.email_digest)) ? row!.email_digest : "bundled") as DigestChoice,
  };
}

/** For emails sent the moment something happens (messages, tier-ups, shop alerts). */
export async function wantsEmail(userId: string, group: string): Promise<boolean> {
  const p = await emailPrefs(userId);
  return p.digest !== "off" && !p.off.includes(group);
}

// ---- One-click "stop these emails" ----

function secret() {
  return process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev";
}
export function emailsOffToken(userId: string): string {
  return createHmac("sha256", secret()).update(`notif-off:${userId}`).digest("hex").slice(0, 32);
}
export function validEmailsOffToken(userId: string, token: string): boolean {
  const want = Buffer.from(emailsOffToken(userId));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}
export function emailsOffUrl(userId: string): string {
  return `${SITE}/api/email/notifications-off?u=${encodeURIComponent(userId)}&t=${emailsOffToken(userId)}`;
}

/** Footer every notification email carries: change settings, or stop them in one click. */
export function notificationFooter(userId: string): string {
  return `You're getting this because you have notifications on at Underground Aquarium. <a href="${SITE}/notifications#settings" style="color:#3b82a6;">Choose which emails you get</a> or <a href="${emailsOffUrl(userId)}" style="color:#3b82a6;">stop notification emails</a>.`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function laHour(d = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", hour12: false }).format(d)) % 24;
}

type Row = { id: string; user_id: string; type: string | null; title: string; body: string | null; link: string | null; created_at: string };

function digestHtml(userId: string, items: Row[], daily: boolean): { subject: string; html: string } {
  const first = items[0];
  const more = items.length - 1;
  const subject =
    items.length === 1 ? first.title : `${first.title}${more > 0 ? `, and ${more} more` : ""}`;
  const list = items
    .slice(0, 12)
    .map((n) => {
      const url = n.link && n.link.startsWith("/") ? `${SITE}${n.link}` : `${SITE}/notifications`;
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #e6ecf1;font-family:Helvetica,Arial,sans-serif;">
        <a href="${url}" style="font-size:15px;font-weight:600;color:#0c2740;text-decoration:none;">${esc(n.title)}</a>
        ${n.body ? `<div style="margin-top:4px;font-size:14px;line-height:1.5;color:#4a6274;">${esc(n.body.length > 200 ? `${n.body.slice(0, 197)}...` : n.body)}</div>` : ""}
      </td></tr>`;
    })
    .join("");
  const extra = items.length > 12 ? `<p style="margin:12px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#4a6274;">And ${items.length - 12} more on the site.</p>` : "";
  const html = emailLayout({
    preheader: first.body ?? first.title,
    title: daily ? "Your day on Underground Aquarium" : items.length === 1 ? "Something new for you" : `${items.length} new things for you`,
    intro: daily ? "Here's what happened since yesterday." : undefined,
    bodyHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${list}</table>${extra}`,
    cta: { label: "Open Underground Aquarium", url: `${SITE}/notifications` },
    footerNote: notificationFooter(userId),
  });
  return { subject: subject.length > 120 ? `${subject.slice(0, 117)}...` : subject, html };
}

/** The job: runs every 15 minutes. */
export async function runNotificationEmails({ dry = false } = {}) {
  const now = Date.now();
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, type, title, body, link, created_at, read")
    .is("emailed_at", null)
    .lt("created_at", new Date(now - WAIT_MINUTES * 60_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(3000);
  const rows = ((data ?? []) as (Row & { read: boolean })[]).filter((r) => !SHOP_TYPES.includes(r.type ?? ""));

  const byUser = new Map<string, (Row & { read: boolean })[]>();
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);

  const stamp = new Date().toISOString();
  let sent = 0;
  let skipped = 0;
  const done: string[] = []; // handled without an email: read already, old, or turned off

  for (const [userId, list] of byUser) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email_off, email_digest, last_digest_at")
      .eq("id", userId)
      .maybeSingle();
    const p = prof as { email_off?: string[] | null; email_digest?: string | null; last_digest_at?: string | null } | null;
    const off = p?.email_off ?? DEFAULT_EMAIL_OFF;
    const digest = p?.email_digest ?? "bundled";

    const tooOld = (r: Row) => now - new Date(r.created_at).getTime() > MAX_AGE_DAYS * 86_400_000;
    const wanted = list.filter((r) => {
      const g = groupFor(r.type);
      return !r.read && !tooOld(r) && digest !== "off" && (g === null || !off.includes(g));
    });
    for (const r of list) if (!wanted.includes(r)) done.push(r.id);
    if (wanted.length === 0) continue;

    // Not time yet: leave them waiting for the next run.
    const last = p?.last_digest_at ? new Date(p.last_digest_at).getTime() : 0;
    if (digest === "bundled" && now - last < BUNDLE_GAP_MIN * 60_000) {
      skipped++;
      continue;
    }
    if (digest === "daily" && (laHour() < DAILY_HOUR || now - last < 20 * 3_600_000)) {
      skipped++;
      continue;
    }

    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const to = u?.user?.email;
    const ids = wanted.map((r) => r.id);
    if (!to) {
      done.push(...ids);
      continue;
    }
    if (dry) {
      sent++;
      continue;
    }
    const { subject, html } = digestHtml(userId, wanted, digest === "daily");
    try {
      await dispatchOne({ kind: "notification_email", to, subject, html, retryLater: true, context: { user_id: userId, count: ids.length } });
      sent++;
    } catch {
      // A bounced or blocked address: don't keep trying these.
    }
    await supabaseAdmin.from("notifications").update({ emailed_at: stamp }).in("id", ids);
    await supabaseAdmin.from("profiles").update({ last_digest_at: stamp }).eq("id", userId);
  }

  if (!dry && done.length) {
    for (let i = 0; i < done.length; i += 500) {
      await supabaseAdmin.from("notifications").update({ emailed_at: stamp }).in("id", done.slice(i, i + 500));
    }
  }
  return { members: byUser.size, sent, waiting: skipped, handledWithoutEmail: done.length };
}

export { NOTIFICATION_GROUPS };
