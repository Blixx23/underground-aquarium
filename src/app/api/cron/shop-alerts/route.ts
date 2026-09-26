import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { dispatchOne } from "@/lib/email/queue";
import {
  fixEmail,
  milestoneEmail,
  reviewEmail,
  weeklyEmail,
  weeklySummary,
  weeklyTip,
  type ShopCard,
  type WeeklyFacts,
} from "@/lib/email/shopEmails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SHOP_TYPES = ["shop_review", "shop_fix", "shop_milestone", "shop_weekly"];

/** Monday's date in Los Angeles, e.g. 2026-09-28, if it's Monday 8am or later there. */
function mondayKey(now = new Date()): string | null {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  if (parts.weekday !== "Mon" || Number(parts.hour) < 8) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Every 10 minutes:
 *  1. On Monday morning (8am Pacific), builds each claimed shop's weekly
 *     report as a notification. Once per shop per week.
 *  2. Emails any shop alert not emailed yet: reviews, listing fixes,
 *     milestones and the weekly report. Anything the owner muted never
 *     becomes a notification, so it's never emailed either.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let weekly = 0;
  const week = mondayKey();
  if (week) {
    const { data: shops } = await supabaseAdmin
      .from("fish_stores")
      .select("id, claimed_by")
      .not("claimed_by", "is", null)
      .limit(2000);

    for (const s of shops ?? []) {
      const owner = s.claimed_by as string;
      const { count } = await supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", owner)
        .eq("type", "shop_weekly")
        .eq("data->>store_id", s.id)
        .eq("data->>week", week);
      if ((count ?? 0) > 0) continue;

      const { data: facts, error } = await supabaseAdmin.rpc("shop_weekly_facts", { p_store: s.id });
      if (error || !facts) continue;
      const f = facts as WeeklyFacts;
      const { title, body } = weeklySummary(f);
      const tip = weeklyTip(f);
      await supabaseAdmin.from("notifications").insert({
        user_id: owner,
        type: "shop_weekly",
        title,
        body,
        link: `/my/shops/${f.slug}`,
        data: { ...f, week, tip, cta: "Open your dashboard" },
      });
      weekly++;
    }
  }

  // Email pass. Claim each row before sending so two runs can't double-send.
  const since = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, type, data")
    .in("type", SHOP_TYPES)
    .is("emailed_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(40);

  const emails = new Map<string, string | null>();
  let sent = 0;
  let failed = 0;

  for (const n of rows ?? []) {
    const { data: claimed } = await supabaseAdmin
      .from("notifications")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", n.id)
      .is("emailed_at", null)
      .select("id");
    if (!claimed?.length) continue;

    const uid = n.user_id as string;
    if (!emails.has(uid)) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      emails.set(uid, u?.user?.email ?? null);
    }
    const to = emails.get(uid);
    const d = (n.data ?? {}) as ShopCard & Record<string, unknown>;
    if (!to || !d.slug) continue;

    const msg =
      n.type === "shop_review"
        ? reviewEmail(d as Parameters<typeof reviewEmail>[0])
        : n.type === "shop_fix"
          ? fixEmail(d as Parameters<typeof fixEmail>[0])
          : n.type === "shop_milestone"
            ? milestoneEmail(d as Parameters<typeof milestoneEmail>[0])
            : weeklyEmail(d as unknown as WeeklyFacts);

    try {
      await dispatchOne({ kind: n.type as string, to, subject: msg.subject, html: msg.html, context: { notification: n.id } });
      sent++;
    } catch {
      // Unsubscribed or bounced address, or a delivery error already
      // logged by the email system. The in-app notice still stands.
      failed++;
    }
  }

  return NextResponse.json({ ok: true, weekly, sent, failed });
}
