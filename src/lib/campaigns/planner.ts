import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dedupKey, unsubscribeUrlFor } from "@/lib/email/queue";
import { normaliseEmail } from "@/lib/email/address";
import { suppress, suppressedSet } from "@/lib/email/suppress";
import { checkDomains, domainOf, type DomainCheck } from "@/lib/email/mx";
import { getEmailSettings } from "@/lib/email/settings";
import { outreachProblem, tidyOutreachEmail } from "@/lib/email/outreach";
import { letterShell } from "@/lib/email/shell";
import { previewLine, renderBody, renderSubject, varsForStore } from "@/lib/campaigns/render";
import { factsFor, subjectHook, whatsHappening, whatsMissing } from "@/lib/campaigns/facts";
import { newsEmail, reviewsSince, type ReviewNews } from "@/lib/campaigns/news";
import { claimToken } from "@/lib/stores/claimToken";
import { SITE } from "@/lib/email/queue";

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
  last_sent_at: string | null;
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
  /** Addresses whose domain can't receive mail, put on the do-not-email list instead of sent. */
  undeliverable: number;
  /** Shops past the sequence that got a "new review" email this run. */
  news: number;
  /** Shops past the sequence with nothing new, so nothing was sent. Checked again in a week. */
  quiet: number;
};

/** A shop with no news is looked at again this often. */
const NEWS_RECHECK_DAYS = 7;

const day = 86_400_000;

/**
 * Put addresses with dead domains on the do-not-email list as "invalid",
 * so nothing is ever sent to them. On a dry run, only count.
 */
async function blockDead(checks: Map<string, DomainCheck>, dry: boolean): Promise<number> {
  const dead = [...checks].filter(([, c]) => c === "dead").map(([email]) => email);
  if (dry) return dead.length;
  for (let i = 0; i < dead.length; i += 20) {
    await Promise.all(
      dead.slice(i, i + 20).map((email) => suppress(email, "invalid", `No mail server for ${domainOf(email)}`))
    );
  }
  return dead.length;
}

/**
 * Enrol every shop that belongs in this campaign and isn't in it yet.
 *
 * This is a sweep, not a trigger: it picks up shops added to the
 * directory since the last run, shops whose email was filled in later,
 * and the ones already sitting there. A trigger would only ever catch
 * the first of those, and would go stale the moment an import ran.
 */
async function enrolAudience(campaign: Campaign, dry = false): Promise<{ added: number; dead: number }> {
  if (campaign.audience !== "unclaimed_shops") return { added: 0, dead: 0 };

  const { data: already } = await supabaseAdmin
    .from("email_campaign_enrollments")
    .select("store_id")
    .eq("campaign_id", campaign.id);
  const have = new Set(((already ?? []) as { store_id: string | null }[]).map((r) => r.store_id));

  // Shops with an address we can write to, that nobody has claimed and
  // that are actually shown in the directory (hidden = not a fish store).
  const rows: { store_id: string; email: string }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("store_contacts")
      .select("store_id, email, fish_stores!inner(id, claimed_by, status)")
      .not("email", "is", null)
      .is("unsubscribed_at", null)
      .is("fish_stores.claimed_by", null)
      .eq("fish_stores.status", "published")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as unknown as { store_id: string; email: string | null }[];
    for (const r of page) if (r.email) rows.push({ store_id: r.store_id, email: tidyOutreachEmail(r.email) });
    if (page.length < pageSize) break;
  }

  // Template placeholders and scraped junk never get enrolled; they go on
  // the do-not-email list so they're skipped for good.
  const seen = rows.filter((r) => !have.has(r.store_id));
  const junk = seen.filter((r) => outreachProblem(r.email));
  if (!dry) for (const r of junk) await suppress(r.email, "invalid", outreachProblem(r.email) ?? undefined).catch(() => {});
  const unseen = seen.filter((r) => !outreachProblem(r.email));
  if (unseen.length === 0) return { added: 0, dead: junk.length };

  // Never enrol an address we already promised not to write to. Campaign
  // mail is marketing, so an unsubscribe or a bounce both keep them out.
  const blocked = await suppressedSet(unseen.map((r) => r.email), "marketing");
  const open = unseen.filter((r) => !blocked.has(normaliseEmail(r.email)));

  // Only enrol addresses whose domain has a mail server. Dead ones go on
  // the do-not-email list; ones we couldn't check yet wait for next run.
  const checks = await checkDomains(open.map((r) => r.email));
  const dead = (await blockDead(checks, dry)) + junk.length;
  const fresh = open.filter((r) => checks.get(normaliseEmail(r.email)) === "ok");

  // A dry run only counts. It must never write, or "What would a run
  // do?" would quietly do it.
  if (dry) return { added: fresh.length, dead };

  let added = 0;
  for (let i = 0; i < fresh.length; i += 500) {
    const slice = fresh
      .slice(i, i + 500)
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
  return { added, dead };
}

/**
 * Anyone who claimed their shop, unsubscribed or bounced comes off the
 * list. Returns the enrolments it stopped (or, on a dry run, would stop).
 */
async function stopTheFinished(campaign: Campaign, dry = false): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from("email_campaign_enrollments")
    .select("id, store_id, email")
    .eq("campaign_id", campaign.id)
    .eq("status", "active")
    .limit(5000);
  const active = (data ?? []) as { id: string; store_id: string | null; email: string }[];
  if (active.length === 0) return new Set();

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

  // Shops hidden from the directory (not fish stores, or taken down).
  for (let i = 0; i < storeIds.length; i += 500) {
    const { data: gone } = await supabaseAdmin
      .from("fish_stores")
      .select("id")
      .in("id", storeIds.slice(i, i + 500))
      .neq("status", "published");
    const ids = new Set(((gone ?? []) as { id: string }[]).map((r) => r.id));
    for (const e of active) if (e.store_id && ids.has(e.store_id) && !stop.has(e.id)) stop.set(e.id, "hidden");
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
  const blocked = await suppressedSet(active.map((e) => e.email), "marketing");
  for (const e of active) if (blocked.has(normaliseEmail(e.email))) stop.set(e.id, "unsubscribed");

  // A dry run reports who would come off, and changes nothing.
  if (stop.size === 0 || dry) return new Set(stop.keys());

  const byReason = new Map<string, string[]>();
  for (const [id, reason] of stop) {
    const list = byReason.get(reason) ?? [];
    list.push(id);
    byReason.set(reason, list);
  }
  for (const [reason, ids] of byReason) {
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const { error } = await supabaseAdmin
        .from("email_campaign_enrollments")
        .update({ status: "stopped", stop_reason: reason, stopped_at: new Date().toISOString() })
        .in("id", chunk);
      // If the database only knows the older reasons, still stop them.
      if (error && reason === "hidden") {
        await supabaseAdmin
          .from("email_campaign_enrollments")
          .update({ status: "stopped", stop_reason: "unsubscribed", stopped_at: new Date().toISOString() })
          .in("id", chunk);
      }
    }
  }
  return new Set(stop.keys());
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
 * end of the steps they move up a cycle, and from then on they get no
 * more of the sequence: only a news email when their page has new
 * reviews, at most once every repeat_days, checked weekly. The cycle
 * number is part of the dedup key, so each news email goes out once.
 */
export async function runCampaign(campaign: Campaign, opts: { dry?: boolean; limit?: number } = {}): Promise<PlanResult> {
  const out: PlanResult = { enrolled: 0, stopped: 0, queued: 0, finished: 0, recycled: 0, skipped: 0, budget: 0, undeliverable: 0, news: 0, quiet: 0 };

  // On a dry run both of these only count; nothing is written anywhere.
  const enrol = await enrolAudience(campaign, Boolean(opts.dry));
  out.enrolled = enrol.added;
  out.undeliverable = enrol.dead;
  const stoppedIds = await stopTheFinished(campaign, Boolean(opts.dry));
  out.stopped = stoppedIds.size;

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
    .select("id, campaign_id, store_id, email, next_step, sent_count, cycle, last_sent_at")
    .eq("campaign_id", campaign.id)
    .eq("status", "active")
    .lte("next_send_at", new Date().toISOString())
    .order("cycle", { ascending: true })      // people who have heard from us least go first
    .order("next_send_at", { ascending: true })
    .limit(budget);
  // On a real run the stopped ones are already off the list. On a dry run
  // they're still marked active, so leave them out here by hand, or the
  // count would include mail to shops that are about to be dropped.
  const due = ((dueData ?? []) as Enrollment[]).filter((e) => !stoppedIds.has(e.id));
  if (due.length === 0) return out;

  const storeIds = due.map((e) => e.store_id).filter(Boolean) as string[];
  const { data: storeData } = await supabaseAdmin
    .from("fish_stores")
    .select("id, slug, name, city, state")
    .in("id", storeIds);
  const storeById = new Map(((storeData ?? []) as Store[]).map((s) => [s.id, s]));

  // What is actually true about each of these shops right now. This is
  // what makes the email worth opening: everything in it can be checked
  // on their own page in about two seconds.
  const facts = await factsFor(storeIds);

  // A shop that has been through every email once doesn't get the sequence
  // again. It hears from us only when there's news on its page (see
  // lib/campaigns/news), at most once every repeat_days.
  const newsMode = (e: Enrollment) => Boolean(repeat) && e.cycle > 0;
  const fallbackSince = new Date(Date.now() - (repeat ?? 30) * day).toISOString();
  const news = await reviewsSince(
    due
      .filter((e) => newsMode(e) && e.store_id)
      .map((e) => ({ storeId: e.store_id as string, since: e.last_sent_at ?? fallbackSince }))
  );

  // Shops enrolled before domain checks existed (and domains that have
  // died since) get checked here, right before anything is queued.
  // Dead ones are blocked now and come off the list on the next run.
  // Same address care as at enrolment, for shops enrolled before it existed.
  const junkIds = new Set<string>();
  for (const e of due) {
    const tidy = tidyOutreachEmail(e.email);
    const problem = outreachProblem(tidy);
    if (problem) {
      junkIds.add(e.id);
      if (!opts.dry) await suppress(e.email, "invalid", problem).catch(() => {});
      continue;
    }
    if (tidy !== e.email) {
      if (!opts.dry) await supabaseAdmin.from("email_campaign_enrollments").update({ email: tidy }).eq("id", e.id);
      e.email = tidy;
    }
  }
  out.undeliverable += junkIds.size;
  const domainChecks = await checkDomains(due.filter((e) => !junkIds.has(e.id)).map((e) => e.email), { budgetMs: 10_000 });
  out.undeliverable += await blockDead(domainChecks, Boolean(opts.dry));

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
    // Dead domain: blocked above, never queued. Couldn't check: leave it
    // exactly as it is and try again next run.
    if (junkIds.has(e.id) || domainChecks.get(normaliseEmail(e.email)) !== "ok") {
      out.skipped++;
      continue;
    }

    const step = byNumber.get(e.next_step);
    const store = e.store_id ? storeById.get(e.store_id) : undefined;

    if (newsMode(e) && store) {
      const n: ReviewNews | undefined = news.get(store.id);
      if (!n || n.count === 0) {
        // Nothing new: send nothing, look again next week.
        out.quiet++;
        if (!opts.dry) {
          await supabaseAdmin
            .from("email_campaign_enrollments")
            .update({ next_send_at: new Date(Date.now() + NEWS_RECHECK_DAYS * day).toISOString() })
            .eq("id", e.id);
        }
        continue;
      }
      if (opts.dry) {
        out.news++;
        out.queued++;
        continue;
      }
      const vars = varsForStore(store, { claim_link: `${SITE}/claim/${store.slug}?t=${claimToken(store.id)}` });
      const mail = newsEmail(n);
      const { error } = await supabaseAdmin.from("email_queue").insert({
        kind: `campaign:${campaign.key}`,
        bulk: true,
        dedup_key: dedupKey(["campaign-news", campaign.id, e.id, e.cycle]),
        to_email: e.email,
        subject: renderSubject(mail.subject, vars),
        html: letterShell({
          preheader: previewLine(mail.body, vars),
          contentHtml: renderBody(mail.body, vars),
          unsubscribeUrl: unsubscribeUrlFor(e.email),
        }),
        reply_to: campaign.reply_to,
        context: { campaign: campaign.key, news: "reviews", reviews: n.count, cycle: e.cycle, enrollment_id: e.id, store_id: e.store_id },
      });
      if (error && error.code !== "23505") throw new Error(error.message);
      if (!error) {
        out.queued++;
        out.news++;
      } else out.skipped++;
      const now = new Date();
      await supabaseAdmin
        .from("email_campaign_enrollments")
        .update({
          last_sent_at: now.toISOString(),
          sent_count: e.sent_count + 1,
          cycle: e.cycle + 1,
          next_step: firstLive ?? e.next_step,
          // The gap before the next possible news email.
          next_send_at: new Date(now.getTime() + (repeat ?? 30) * day).toISOString(),
        })
        .eq("id", e.id);
      continue;
    }

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

    const f = facts.get(store.id);
    const vars = varsForStore(store, {
      // One press, no form: the token says this went to the address the
      // shop itself publishes.
      claim_link: `${SITE}/claim/${store.slug}?t=${claimToken(store.id)}`,
      whats_happening: f ? whatsHappening(f, store.name) : "",
      whats_missing: f ? whatsMissing(f) : "",
    });
    const subject = renderSubject(
      // A bare {{subject_hook}} means "pick the best true one for this shop".
      step.subject.trim() === "{{subject_hook}}" && f
        ? subjectHook(f, store.name)
        : step.subject,
      vars
    );
    // The planner writes the finished document, rather than leaving it to
    // the queue, so what is stored is exactly what gets delivered and the
    // admin panel shows the real thing.
    const html = letterShell({
      preheader: previewLine(step.body, vars),
      contentHtml: renderBody(step.body, vars, { label: step.cta_label, url: step.cta_url }),
      unsubscribeUrl: unsubscribeUrlFor(e.email),
    });

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
