import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailLayout, emailStats } from "@/lib/email";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.undergroundaquarium.com";

type Row = {
  id: string;
  club_id: string;
  user_id: string | null;
  email: string | null;
  status: string;
  paid_through: string | null;
  clubs: {
    slug: string;
    name: string;
    dues_amount_cents: number;
    payouts_enabled: boolean;
  } | null;
};

type ReminderKind = "10d" | "3d" | "0d" | "past3d";

function kindForDays(days: number): ReminderKind | null {
  if (days === 10) return "10d";
  if (days === 3) return "3d";
  if (days === 0) return "0d";
  if (days === -3) return "past3d";
  return null;
}

function buildEmail(
  kind: ReminderKind,
  clubName: string,
  amount: string,
  dateLabel: string,
  link: string
): { subject: string; html: string } {
  const cta = { label: "Renew your membership", url: link };
  const club = `<strong>${clubName}</strong>`;
  switch (kind) {
    case "10d":
      return {
        subject: `Your ${clubName} dues renew in 10 days`,
        html: emailLayout({
          preheader: `Your ${clubName} membership renews on ${dateLabel}`,
          title: "Membership renewal coming up",
          intro: `Heads up — your ${club} membership renews in about 10 days.`,
          bodyHtml: emailStats([["Amount", `$${amount}`], ["Renews on", dateLabel]]),
          cta,
        }),
      };
    case "3d":
      return {
        subject: `Your ${clubName} dues renew in 3 days`,
        html: emailLayout({
          preheader: `Your ${clubName} membership renews on ${dateLabel}`,
          title: "Renewal in 3 days",
          intro: `Your ${club} membership renews in just 3 days.`,
          bodyHtml: emailStats([["Amount", `$${amount}`], ["Renews on", dateLabel]]),
          cta,
        }),
      };
    case "0d":
      return {
        subject: `Your ${clubName} dues are due today`,
        html: emailLayout({
          preheader: `Your ${clubName} dues are due today`,
          title: "Your dues are due today",
          intro: `Your ${club} membership is due today. Renew now to stay active.`,
          bodyHtml: emailStats([["Amount", `$${amount}`], ["Due", dateLabel]]),
          cta,
        }),
      };
    case "past3d":
      return {
        subject: `Your ${clubName} membership has lapsed`,
        html: emailLayout({
          preheader: `Your ${clubName} membership has lapsed`,
          title: "Your membership has lapsed",
          intro: `Your ${club} membership lapsed. Renew anytime to return to active standing.`,
          bodyHtml: emailStats([["Amount", `$${amount}`], ["Lapsed on", dateLabel]]),
          cta,
        }),
      };
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  const { data, error } = await supabaseAdmin
    .from("club_members")
    .select(
      "id, club_id, user_id, email, status, paid_through, clubs(slug, name, dues_amount_cents, payouts_enabled)"
    )
    .not("paid_through", "is", null)
    .neq("role", "owner")
    .in("status", ["active", "lapsed"])
    // Family members are covered by their main member — never remind them.
    .is("family_primary_id", null);

  if (error) {
    console.error("dues-reminders query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Row[];
  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  let lapsed = 0;
  let emailed = 0;

  for (const m of rows) {
    const club = m.clubs;
    if (!club || !club.dues_amount_cents || club.dues_amount_cents <= 0) continue;
    if (!m.paid_through) continue;

    const ptUTC = Date.parse(`${m.paid_through}T00:00:00Z`);
    const days = Math.round((ptUTC - todayUTC) / 86400000);

    // Lapse expired members who are still marked active.
    if (m.status === "active" && days < 0) {
      const { error: lapseErr } = await supabaseAdmin
        .from("club_members")
        .update({ status: "lapsed" })
        .eq("id", m.id);
      if (!lapseErr) lapsed++;
    }

    // Reminders only for clubs that can actually take a payment.
    if (!club.payouts_enabled) continue;
    const kind = kindForDays(days);
    if (!kind) continue;

    // Skip if this reminder already went out for this cycle.
    const { data: existing } = await supabaseAdmin
      .from("dues_reminders")
      .select("id")
      .eq("member_id", m.id)
      .eq("kind", kind)
      .eq("covers_until", m.paid_through)
      .maybeSingle();
    if (existing) continue;

    // Figure out where to send it.
    let to = m.email;
    if (!to && m.user_id) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      to = u?.user?.email ?? null;
    }
    if (!to || !resend) continue;

    const amount = (club.dues_amount_cents / 100).toFixed(2);
    const dateLabel = new Date(ptUTC).toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const link = `${SITE_URL}/c/${club.slug}`;
    const { subject, html } = buildEmail(kind, club.name, amount, dateLabel, link);

    try {
      await resend.emails.send({
        from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
        to,
        subject,
        html,
      });
    } catch (e) {
      console.error(`Dues reminder email failed for member ${m.id}:`, e);
      continue; // don't mark as sent if the email didn't go out
    }

    await supabaseAdmin.from("dues_reminders").insert({
      club_id: m.club_id,
      member_id: m.id,
      kind,
      covers_until: m.paid_through,
    });
    emailed++;
  }

  console.log(`dues-reminders: lapsed ${lapsed}, emailed ${emailed}`);
  return NextResponse.json({ ok: true, lapsed, emailed });
}
