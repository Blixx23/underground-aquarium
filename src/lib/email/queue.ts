import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkEmail, normaliseEmail } from "@/lib/email/address";
import { classify, backoffMs } from "@/lib/email/failure";
import { deliver } from "@/lib/email/provider";
import { getEmailSettings } from "@/lib/email/settings";
import { suppressedSet, suppress } from "@/lib/email/suppress";
import { letterShell } from "@/lib/email/shell";

export const SITE = "https://www.undergroundaquarium.com";
export const MAX_ATTEMPTS = 5;
/** Under this many recipients an interactive send goes out inline. */
export const INLINE_LIMIT = 50;

export type Recipient = {
  email: string;
  subject: string;
  html: string;
  preheader?: string;
  context?: Record<string, unknown>;
};

export type DispatchResult = {
  queued: number;
  sentInline: number;
  failed: number;
  suppressed: number;
  skipped: number;
  paused: boolean;
};

const empty = (): DispatchResult => ({
  queued: 0, sentInline: 0, failed: 0, suppressed: 0, skipped: 0, paused: false,
});

/** Deterministic, so replanning the same thing can never double-send. */
export function dedupKey(parts: (string | number | null | undefined)[]): string {
  return createHash("sha256").update(parts.map((p) => String(p ?? "")).join("|")).digest("hex").slice(0, 40);
}

/** Signed token so one-click unsubscribe needs no login and can't be forged. */
export function unsubscribeToken(email: string): string {
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev";
  return createHmac("sha256", secret).update(normaliseEmail(email)).digest("hex").slice(0, 32);
}

export function unsubscribeUrlFor(email: string): string {
  const e = encodeURIComponent(normaliseEmail(email));
  return `${SITE}/api/email/unsubscribe?e=${e}&t=${unsubscribeToken(email)}`;
}

export function validUnsubscribeToken(email: string, token: string): boolean {
  const want = Buffer.from(unsubscribeToken(email));
  const got = Buffer.from(String(token || ""));
  return want.length === got.length && timingSafeEqual(want, got);
}

/**
 * Bulk mail is wrapped in the plain letter shell, which carries the
 * wordmark, the postal address and the opt out. Callers hand in
 * paragraphs, not a whole document.
 */
function wrap(html: string, email: string, bulk: boolean, preheader?: string): string {
  if (!bulk) return html;
  return letterShell({ preheader, contentHtml: html, unsubscribeUrl: unsubscribeUrlFor(email) });
}

/**
 * Put one row in the queue. Returns false only when the row already
 * existed (same dedup key), which is a success, not an error.
 */
async function enqueue(row: {
  kind: string;
  bulk: boolean;
  dedup_key: string;
  to_email: string;
  subject: string;
  html: string;
  reply_to?: string | null;
  context?: Record<string, unknown>;
  scheduled_at?: string;
}): Promise<boolean> {
  const { error } = await supabaseAdmin.from("email_queue").insert({
    ...row,
    to_email: normaliseEmail(row.to_email),
    context: row.context ?? {},
  });
  if (!error) return true;
  if (error.code === "23505") return false; // already queued: fine
  throw new Error(error.message);
}

/** A terminal row for something that went out (or failed) without the worker. */
async function recordDirect(args: {
  kind: string;
  bulk: boolean;
  to: string;
  subject: string;
  html: string;
  status: "sent" | "failed";
  providerId?: string | null;
  error?: string | null;
  failReason?: string | null;
  context?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("email_queue").insert({
    kind: args.kind,
    bulk: args.bulk,
    dedup_key: dedupKey([args.kind, args.to, args.subject, Date.now(), Math.random()]),
    to_email: normaliseEmail(args.to),
    subject: args.subject,
    html: args.html,
    status: args.status,
    direct: true,
    attempts: 1,
    provider_id: args.providerId ?? null,
    last_error: args.error ?? null,
    fail_reason: args.failReason ?? null,
    sent_at: args.status === "sent" ? new Date().toISOString() : null,
    context: args.context ?? {},
  });
  if (error) console.error("[email] could not record a direct send:", error.message);
}

/**
 * One recipient, right now (invite, receipt, alert). Throws for a
 * suppressed or malformed address, because a person just pressed a
 * button and deserves to be told.
 */
export async function dispatchOne(args: {
  kind: string;
  to: string;
  subject: string;
  html: string;
  bulk?: boolean;
  replyTo?: string;
  context?: Record<string, unknown>;
  /** One short line for the inbox preview. Bulk mail only. */
  preheader?: string;
  /** Alerts to the admin ignore the kill switch, so a freeze can't silence the alarm. */
  ignorePause?: boolean;
}): Promise<{ sent: boolean; queued: boolean }> {
  const check = checkEmail(args.to);
  if (!check.ok || !check.value) throw new Error(check.reason ?? "No email address.");
  const to = normaliseEmail(check.value);

  const bulk = Boolean(args.bulk);
  const set = await suppressedSet([to]);
  if (set.has(to)) throw new Error("That address has unsubscribed or bounced.");

  const settings = await getEmailSettings();
  const held = !args.ignorePause && (settings.paused || (bulk && settings.bulk_paused));
  const html = wrap(args.html, to, bulk, args.preheader);

  if (held) {
    await enqueue({
      kind: args.kind, bulk, dedup_key: dedupKey([args.kind, to, args.subject, Date.now()]),
      to_email: to, subject: args.subject, html, reply_to: args.replyTo ?? null, context: args.context,
    });
    return { sent: false, queued: true };
  }

  try {
    const id = await deliver({
      to, subject: args.subject, html, bulk, replyTo: args.replyTo,
      unsubscribeUrl: bulk ? unsubscribeUrlFor(to) : undefined,
    });
    await recordDirect({ kind: args.kind, bulk, to, subject: args.subject, html, status: "sent", providerId: id, context: args.context });
    return { sent: true, queued: false };
  } catch (err) {
    const c = classify(err);
    await recordDirect({
      kind: args.kind, bulk, to, subject: args.subject, html, status: "failed",
      error: c.message, failReason: c.kind, context: args.context,
    });
    if (c.permanent) await suppress(to, "invalid", c.message);
    throw new Error(c.message);
  }
}

/**
 * A group send. Always goes through the queue, so nothing depends on one
 * request surviving long enough to deliver hundreds of emails.
 */
export async function dispatchToEach(args: {
  kind: string;
  recipients: Recipient[];
  bulk?: boolean;
  replyTo?: string;
  /** Same key for the same planned send, so re-running plans nothing twice. */
  batchKey: string;
}): Promise<DispatchResult> {
  const out = empty();
  const bulk = Boolean(args.bulk);

  const usable = args.recipients.filter((r) => {
    const c = checkEmail(r.email);
    if (!c.ok || !c.value) {
      out.skipped++;
      return false;
    }
    return true;
  });

  const set = await suppressedSet(usable.map((r) => r.email));
  const settings = await getEmailSettings();
  out.paused = settings.paused || (bulk && settings.bulk_paused);

  for (const r of usable) {
    const to = normaliseEmail(r.email);
    if (set.has(to)) {
      out.suppressed++;
      continue;
    }
    const added = await enqueue({
      kind: args.kind,
      bulk,
      dedup_key: dedupKey([args.batchKey, args.kind, to]),
      to_email: to,
      subject: r.subject,
      html: wrap(r.html, to, bulk, r.preheader),
      reply_to: args.replyTo ?? null,
      context: r.context,
    });
    if (added) out.queued++;
    else out.skipped++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The worker
// ---------------------------------------------------------------------------

type QueueRow = {
  id: string; kind: string; bulk: boolean; to_email: string; subject: string;
  html: string; reply_to: string | null; attempts: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Claim a chunk of pending rows and deliver them. A row is marked sent
 * ONLY after the provider accepts it, so a run cut short leaves work
 * pending rather than pretending it went out.
 *
 * Paced for Resend's 10 requests a second, assuming two runs can overlap:
 * 4 at a time with a one-second floor per group is about 4/sec.
 */
export async function runWorker({ limit = 60, dry = false } = {}): Promise<{
  claimed: number; sent: number; failed: number; retried: number; paused: boolean;
}> {
  const settings = await getEmailSettings();
  if (settings.paused) return { claimed: 0, sent: 0, failed: 0, retried: 0, paused: true };

  // Anything locked more than 15 minutes ago was orphaned by a crash.
  await supabaseAdmin
    .from("email_queue")
    .update({ locked_at: null })
    .eq("status", "pending")
    .lt("locked_at", new Date(Date.now() - 15 * 60_000).toISOString());

  let q = supabaseAdmin
    .from("email_queue")
    .select("id, kind, bulk, to_email, subject, html, reply_to, attempts")
    .eq("status", "pending")
    .is("locked_at", null)
    .lte("scheduled_at", new Date().toISOString())
    .order("bulk", { ascending: true })      // transactional mail first
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (settings.bulk_paused) q = q.eq("bulk", false);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as QueueRow[];
  if (rows.length === 0) return { claimed: 0, sent: 0, failed: 0, retried: 0, paused: false };

  const lockedAt = new Date().toISOString();
  const { error: lockErr } = await supabaseAdmin
    .from("email_queue")
    .update({ locked_at: lockedAt })
    .in("id", rows.map((r) => r.id))
    .eq("status", "pending");
  if (lockErr) throw new Error(lockErr.message);

  if (dry) {
    await supabaseAdmin.from("email_queue").update({ locked_at: null }).in("id", rows.map((r) => r.id));
    return { claimed: rows.length, sent: 0, failed: 0, retried: 0, paused: false };
  }

  // A bulk row still has to respect today's cap.
  let bulkBudget = Infinity;
  if (rows.some((r) => r.bulk)) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("bulk", true)
      .eq("status", "sent")
      .gte("sent_at", since.toISOString());
    bulkBudget = Math.max(0, settings.daily_bulk_cap - (count ?? 0));
  }

  let sent = 0;
  let failed = 0;
  let retried = 0;

  const groups: QueueRow[][] = [];
  for (let i = 0; i < rows.length; i += 4) groups.push(rows.slice(i, i + 4));

  for (const group of groups) {
    const started = Date.now();
    await Promise.all(
      group.map(async (row) => {
        if (row.bulk) {
          if (bulkBudget <= 0) {
            // Over today's cap: put it back for tomorrow, untouched.
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            await supabaseAdmin
              .from("email_queue")
              .update({ locked_at: null, scheduled_at: tomorrow.toISOString() })
              .eq("id", row.id);
            return;
          }
          bulkBudget--;
        }
        try {
          const id = await deliver({
            to: row.to_email, subject: row.subject, html: row.html, bulk: row.bulk,
            replyTo: row.reply_to ?? undefined,
            unsubscribeUrl: row.bulk ? unsubscribeUrlFor(row.to_email) : undefined,
          });
          const { error: markErr } = await supabaseAdmin
            .from("email_queue")
            .update({ status: "sent", sent_at: new Date().toISOString(), provider_id: id, locked_at: null, attempts: row.attempts + 1 })
            .eq("id", row.id);
          // Delivered but unmarked: never recover it to pending, that mails
          // the person twice. Surface it instead.
          if (markErr) console.error("[email] DELIVERED BUT NOT MARKED", row.id, markErr.message);
          sent++;
        } catch (err) {
          const c = classify(err);
          const attempts = row.attempts + 1;
          const giveUp = c.permanent || attempts >= MAX_ATTEMPTS;
          await supabaseAdmin
            .from("email_queue")
            .update({
              status: giveUp ? "failed" : "pending",
              attempts,
              last_error: c.message,
              fail_reason: c.kind,
              locked_at: null,
              scheduled_at: giveUp ? undefined : new Date(Date.now() + backoffMs(attempts)).toISOString(),
            })
            .eq("id", row.id);
          if (c.permanent) await suppress(row.to_email, "invalid", c.message);
          if (giveUp) failed++;
          else retried++;
        }
      })
    );
    const spent = Date.now() - started;
    if (spent < 1000) await sleep(1000 - spent); // hard floor: ~4 requests a second
  }

  return { claimed: rows.length, sent, failed, retried, paused: false };
}
