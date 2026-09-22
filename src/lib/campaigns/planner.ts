import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dedupKey } from "@/lib/email/queue";
import { normaliseEmail } from "@/lib/email/address";
import { suppressedSet } from "@/lib/email/suppress";
import { getEmailSettings } from "@/lib/email/settings";
import { renderBody, renderSubject, varsForStore } from "@/lib/campaigns/render";

export type Campaign = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  audience: string;
  active: boolean;
  /** Set, and the campaign never ends: it comes back around this often. */
  repeat_days: number | null;
  reply_to: string | null;
};

const CAMPAIGN_COLS = "id, key, name, description, audience, active, repeat_days, reply_to";

export type Step = {
  id: string;
  campaign_id: string;
  step: number;
  delay_days: number;
  subject: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  active: boolean;
};

type Enrollment = {
  id: string;
  campaign_id: string;
  store_id: string | null;
  email: string;
  next_step: number;
  sent_count: number;
  cycle: number;
};

type Store = { id: string; slug: string; name: string; city: string | null; state: string | null };

export type PlanResult = {
  enrolled: number;
  stopped: number;
  queued: number;
  finished: number;
  recycled: number;
  skipped: number;
  budget: number;
};

const day = 86_400_000;

/**
 * Enrol every shop that belongs in this campaign and isn't in it yet.
 *
 * This is a sweep, not a trigger: it picks up shops added to the
 * directory since the last run, shops whose email was filled in later,
 * and the ones already sitting there. A trigger would only ever catch
 * the first of those, and would go stale the moment an import ran.
 */
async function enrolAudience(campaign: Campaign): Promise<number> {
  if (campaign.audience !== "unclaimed_shops") return 0;

  const { data: already } = await supabaseAdmin
    .from("email_campaign_enrollments")
    .select("store_id")
    .eq("campaign_id", campaign.id);
  const have = new Set(((already ?? []) as { store_id: string | null }[]).map((r) => r.store_id));

  // Shops with an address we can write to, that nobody has claimed.
  const rows: { store_id: string; email: string }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("store_contacts")
      .select("store_id, email, fish_stores!inner(id, claimed_by)")
      .not("email", "is", null)
      .is("unsubscribed_at", null)
      .is("fish_stores.claimed_by", null)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as unknown as { store_id: string; email: string | null }[];
    for (const r of page) if (r.email) rows.push({ store_id: r.store_id, email: r.email });
    if (page.length < pageSize) break;
  }

  const fresh = rows.filter((r) => !have.has(r.store_id));
  if (fresh.length === 0) return 0;

  // Never enrol an address we already promised not to write to.
  const blocked = await suppressedSet(fresh.map((r) => r.email));

  let added = 0;
  for (let i = 0; i < fresh.length; i += 500) {
    const slice = fresh
      .slice(i, i + 500)
      .filter((r) => !blocked.has(normaliseEmail(r.email)))
      .map((r) => ({
        campaign_id: campaign.id,
        store_id: r.store_id,
        email: normaliseEmail(r.email),
      }));
    if (slice.length === 0) continue;
    const { error } = await supabaseAdmin
      .from("email_campaign_enrollments")
      .upsert(slice, { onConflict: "campaign_id,store_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    added += slice.length;
  }
  return added;
}

/** Anyone who claimed their shop, unsubscribed or bounced comes off the list. */
async function stopTheFinished(campaign: Campaign): Promise<number> {
  const { data } = await supabaseAdmin
    .from("email_campaign_enrollments")
    .select("id, store_id, email")
    .eq("campaign_id", campaign.id)
    .eq("status", "active")
    .limit(5000);
  const active = (data ?? []) as { id: string; store_id: string | null; email: string }[];
  if (active.length === 0) return 0;

  const stop = new Map<string, string>();

  // Claimed shops.
  const storeIds = active.map((e) => e.store_id).filter(Boolean) as string[];
  for (let i = 0; i < storeIds.length; i += 500) {
    const { data: claimed } = await supabaseAdmin
      .from("fish_stores")
      .select("id")
      .in("id", storeIds.slice(i, i + 500))
      .not("claimed_by", "is", null);
    const ids = new Set(((claimed ?? []) as { id: string }[]).map((r) => r.id));
    for (const e of active) if (e.store_id && ids.has(e.store_id)) stop.set(e.id, "claimed");
  }

  // Shops that asked to come off the outreach list.
  for (let i = 0; i < storeIds.length; i += 500) {
    const { data: off } = await supabaseAdmin
      .from("store_contacts")
      .select("store_id")
      .in("store_id", storeIds.slice(i, i + 500))
      .not("unsubscribed_at", "is", null);
    const ids = new Set(((off ?? []) as { store_id: string }[]).map((r) => r.store_id));
    for (const e of active) if (e.store_id && ids.has(e.store_id)) stop.set(e.id, "unsubscribed");
  }

  // Bounced, complained or unsubscribed through the one-click link.
  const blocked = await suppressedSet(active.map((e) => e.email));
  for (const e of active) if (blocked.has(normaliseEmail(e.email))) stop.set(e.id, "unsubscribed");

  if (stop.size === 0) return 0;

  const byReason = new Map<string, string[]>();
  for (const [id, reason] of stop) {
    const list = byReason.get(reason) ?? [];
    list.push(id);
    byReason.set(reason, list);
  }
  for (const [reason, ids] of byReason) {
    for (let i = 0; i < ids.length; i += 500) {
      await supabaseAdmin
        .from("email_campaign_enrollments")
        .update({ status: "stopped", stop_reason: reason, stopped_at: new Date().toISOString() })
        .in("id", ids.slice(i, i + 500));
    }
  }
  return stop.size;
}

/**
 * How many campaign emails we're allowed to add to the queue right now.
 *
 * The worker enforces the daily cap when it sends, but if the planner
 * ignored the cap it would pile thousands of rows into the queue and the
 * whole thing would arrive in the wrong order over months. So the
 * planner keeps the queue about one day deep and no more.
 */
async function todaysBudget(): Promise<number> {
  const settings = await getEmailSettings();
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [{ count: sentToday }, { count: waiting }] = await Promise.all([
    supabaseAdmin
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("bulk", true)
      .eq("status", "sent")
      .gte("sent_at", since.toISOString()),
    supabaseAdmin
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("bulk", true)
      .eq("status", "pending"),
  ]);

  return Math.max(0, settings.daily_bulk_cap - (sentToday ?? 0) - (waiting ?? 0));
}

/**
 * Run one campaign: enrol, stop, then queue whatever is due.
 *
 * A campaign with repeat_days never finishes. When someone reaches the
 * end of the steps they go back to the start, one cycle higher, due
 * again in repeat_days. The cycle number is part of the dedup key, so
 * the same email can go out again in six weeks without the queue
 * treating it as a duplicate of the last one.
 */
export async function runCampaign(campaign: Campaign, opts: { dry?: boolean; limit?: number } = {}): Promise<PlanResult> {
  const out: PlanResult = { enrolled: 0, stopped: 0, queued: 0, finished: 0, recycled: 0, skipped: 0, budget: 0 };

  out.enrolled = await enrolAudience(campaign);
  out.stopped = await stopTheFinished(campaign);

  const { data: stepData } = await supabaseAdmin
    .from("email_campaign_steps")
    .select("id, campaign_id, step, delay_days, subject, body, cta_label, cta_url, active")
    .eq("campaign_id", campaign.id)
    .order("step", { ascending: true });
  const steps = (stepData ?? []) as Step[];
  const byNumber = new Map(steps.map((s) => [s.step, s]));
  const live = steps.filter((s) => s.active);
  const lastStep = steps.length ? Math.max(...steps.map((s) => s.step)) : 0;
  const firstLive = live.length ? live[0].step : null;
  const repeat = campaign.repeat_days && campaign.repeat_days > 0 ? campaign.repeat_days : null;

  const budget = opts.limit ?? (await todaysBudget());
  out.budget = budget;
  if (budget <= 0 || steps.length === 0) return out;

  const { data: dueData } = await supabaseAdmin
    .from("email_campaign_enrollments")
    .select("id, campaign_id, store_id, email, next_step, sent_count, cycle")
    .eq("campaign_id", campaign.id)
    .eq("status", "active")
    .lte("next_send_at", new Date().toISOString())
    .order("cycle", { ascending: true })      // people who have heard from us least go first
    .order("next_send_at", { ascending: true })
    .limit(budget);
  const due = (dueData ?? []) as Enrollment[];
  if (due.length === 0) return out;

  const storeIds = due.map((e) => e.store_id).filter(Boolean) as string[];
  const { data: storeData } = await supabaseAdmin
    .from("fish_stores")
    .select("id, slug, name, city, state")
    .in("id", storeIds);
  const storeById = new Map(((storeData ?? []) as Store[]).map((s) => [s.id, s]));

  /** What happens to an enrolment once its step is dealt with. */
  function afterStep(e: Enrollment, justSent: boolean): Record<string, unknown> {
    const now = new Date();
    const stamps = justSent
      ? { last_sent_at: now.toISOString(), sent_count: e.sent_count + 1 }
      : {};
    const next = byNumber.get(e.next_step + 1);

    if (next) {
      return {
        ...stamps,
        next_step: next.step,
        // Waiting time runs from this email, not from when they enrolled,
        // so a slow ramp doesn't bunch everything up at the end.
        next_send_at: new Date(now.getTime() + next.delay_days * day).toISOString(),
      };
    }
    if (repeat && firstLive !== null) {
      out.recycled += justSent ? 1 : 0;
      return {
        ...stamps,
        next_step: firstLive,
        cycle: e.cycle + 1,
        next_send_at: new Date(now.getTime() + repeat * day).toISOString(),
      };
    }
    out.finished += justSent ? 1 : 0;
    return { ...stamps, status: "done", next_step: e.next_step + 1, stopped_at: now.toISOString() };
  }

  for (const e of due) {
    const step = byNumber.get(e.next_step);
    const store = e.store_id ? storeById.get(e.store_id) : undefined;

    // A step that was turned off, or a shop that vanished: move past it
    // rather than stalling the enrolment there forever.
    if (!step || !step.active || !store) {
      if (!opts.dry) {
        if (!step && e.next_step > lastStep && repeat && firstLive !== null) {
          // Steps were deleted out from under them; start the cycle again.
          await supabaseAdmin
            .from("email_campaign_enrollments")
            .update({
              next_step: firstLive,
              cycle: e.cycle + 1,
              next_send_at: new Date(Date.now() + repeat * day).toISOString(),
            })
            .eq("id", e.id);
        } else {
          await supabaseAdmin.from("email_campaign_enrollments").update(afterStep(e, false)).eq("id", e.id);
        }
      }
      out.skipped++;
      continue;
    }

    const vars = varsForStore(store);
    const subject = renderSubject(step.subject, vars);
    const html = renderBody(step.body, vars, { label: step.cta_label, url: step.cta_url });

    if (opts.dry) {
      out.queued++;
      continue;
    }

    // One row per enrolment per step per cycle, forever. Re-running the
    // planner, twice or a hundred times, can never mail the same thing
    // twice in the same cycle.
    const { error } = await supabaseAdmin.from("email_queue").insert({
      kind: `campaign:${campaign.key}`,
      bulk: true,
      dedup_key: dedupKey(["campaign", campaign.id, e.id, step.step, e.cycle]),
      to_email: e.email,
      subject,
      html,
      reply_to: campaign.reply_to,
      context: { campaign: campaign.key, step: step.step, cycle: e.cycle, enrollment_id: e.id, store_id: e.store_id },
    });
    if (error && error.code !== "23505") throw new Error(error.message);
    if (!error) out.queued++;
    else out.skipped++;

    await supabaseAdmin.from("email_campaign_enrollments").update(afterStep(e, true)).eq("id", e.id);
  }

  return out;
}

export async function getCampaign(key: string): Promise<Campaign | null> {
  const { data } = await supabaseAdmin
    .from("email_campaigns")
    .select(CAMPAIGN_COLS)
    .eq("key", key)
    .maybeSingle();
  return (data as Campaign) ?? null;
}

export async function runAllCampaigns(opts: { dry?: boolean } = {}): Promise<Record<string, PlanResult>> {
  const { data } = await supabaseAdmin.from("email_campaigns").select(CAMPAIGN_COLS).eq("active", true);
  const out: Record<string, PlanResult> = {};
  for (const c of (data ?? []) as Campaign[]) {
    out[c.key] = await runCampaign(c, opts);
  }
  return out;
}
