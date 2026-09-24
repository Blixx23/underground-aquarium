import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailCallout, emailLayout, emailStats, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.undergroundaquarium.com";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Emails a member about something an officer just did for them:
 *   - "approved": their application was accepted, here's how to pay.
 *   - "honorary": they were made an honorary lifetime member.
 * Only the club's owner, admins and officers can trigger it, and only after
 * the change itself has happened in the database.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { memberId?: string; kind?: string };
  const kind = body.kind === "approved" || body.kind === "honorary" ? body.kind : null;
  if (!body.memberId || !kind) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { data: member } = await supabaseAdmin
    .from("club_members")
    .select("id, club_id, user_id, email, display_name, tier, status, honorary, member_number")
    .eq("id", body.memberId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  const { data: me } = await supabaseAdmin
    .from("club_members")
    .select("role")
    .eq("club_id", member.club_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me || !["owner", "admin", "officer"].includes(me.role as string)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  // The change must already be real before we announce it.
  if (kind === "honorary" && !member.honorary) {
    return NextResponse.json({ error: "They aren't honorary yet." }, { status: 409 });
  }
  if (kind === "approved" && !["prospect", "active"].includes(member.status as string)) {
    return NextResponse.json({ error: "They aren't approved yet." }, { status: 409 });
  }

  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("name, slug, dues_amount_cents, lifetime_dues_amount_cents")
    .eq("id", member.club_id)
    .maybeSingle();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  let to = (member.email as string | null) ?? null;
  if (!to && member.user_id) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(member.user_id as string);
    to = u?.user?.email ?? null;
  }

  const firstName = ((member.display_name as string | null) ?? "").trim().split(/\s+/)[0] || null;
  const hi = firstName ? `${esc(firstName)}, ` : "";
  const clubName = esc(club.name as string);
  const clubLink = `${SITE}/c/${club.slug}`;

  let subject: string;
  let html: string;
  let note: { title: string; body: string; link: string };

  if (kind === "honorary") {
    const memberNo = member.member_number ? `No. ${String(member.member_number).padStart(4, "0")}` : null;
    subject = `You've been made an Honorary Lifetime Member of the ${club.name}`;
    html = emailLayout({
      preheader: "An honor the Society gives rarely. No dues, ever.",
      title: "Honorary Lifetime Member",
      intro: `${hi}the officers of the <strong>${clubName}</strong> have named you an <strong>Honorary Lifetime Member</strong>. It's the highest recognition the Society gives, reserved for people who've made a real difference to the hobby and to us. Thank you.`,
      bodyHtml:
        emailStats(
          [
            ["Membership", "Honorary Lifetime"],
            ["Dues", "None, ever"],
            ...(memberNo ? ([["Member", memberNo]] as Array<[string, string]>) : []),
          ]
        ) +
        emailCallout(
          "What comes with it",
          "The gold Society ring on your profile everywhere you post &middot; the judged Breeder Award Program &middot; signed, verifiable certificates &middot; your place on the Species Registry &middot; Society trophies"
        ),
      cta: { label: "Enter the member area", url: `${SITE}/society/home` },
      footerNote: `You're receiving this because the ${clubName} officers granted you honorary membership on Underground Aquarium.`,
    });
    note = {
      title: "You're an Honorary Lifetime Member",
      body: `The ${club.name} officers have named you an honorary lifetime member. No dues, ever.`,
      link: "/society/home",
    };
  } else {
    const lifetime = member.tier === "lifetime";
    const cents = lifetime ? (club.lifetime_dues_amount_cents as number | null) ?? 0 : (club.dues_amount_cents as number) ?? 0;
    const amount = `$${(cents / 100).toFixed(2)}`;
    const paid = cents > 0;
    subject = paid
      ? `You're approved for the ${club.name}. One step left.`
      : `Welcome to the ${club.name}`;
    html = emailLayout({
      preheader: paid ? `Pay ${amount} to activate your membership.` : "Your membership is active.",
      title: paid ? "You're approved" : "Welcome aboard",
      intro: paid
        ? `${hi}good news: your application to the <strong>${clubName}</strong> was approved. Pay your dues and your membership switches on right away.`
        : `${hi}your application to the <strong>${clubName}</strong> was approved and your membership is active.`,
      bodyHtml: paid
        ? emailStats([
            ["Plan", lifetime ? "Lifetime" : "Individual, 1 year"],
            ["Amount", lifetime ? `${amount} once` : `${amount} per year`],
          ])
        : "",
      cta: paid
        ? { label: `Pay ${amount} and activate`, url: clubLink }
        : { label: "Enter the member area", url: `${SITE}/society/home` },
      footerNote: `You're receiving this because you applied to the ${clubName} on Underground Aquarium.`,
    });
    note = {
      title: paid ? `You're approved for the ${club.name}` : `Welcome to the ${club.name}`,
      body: paid ? `Pay ${amount} to activate your membership.` : "Your membership is active.",
      link: paid ? `/c/${club.slug}` : "/society/home",
    };
  }

  // Honorary gets its own in-app notice (approval already has one from the database).
  if (kind === "honorary" && member.user_id) {
    await supabaseAdmin.from("notifications").insert({
      user_id: member.user_id,
      type: "club_honorary",
      title: note.title,
      body: note.body,
      link: note.link,
    });
  }

  const sent = to ? await sendEmail({ kind: `club_${kind}`, to, subject, html }) : false;
  return NextResponse.json({ ok: true, emailed: sent });
}
