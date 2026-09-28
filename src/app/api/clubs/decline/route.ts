import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailLayout, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.undergroundaquarium.com";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Declines a pending application and lets the applicant know.
 *
 * This used to be a bare delete from the browser, so the applicant never
 * heard anything. It runs here instead because the applicant's email and
 * account id have to be read BEFORE the row is removed, and the notice has
 * to be written into someone else's notifications, which RLS won't allow
 * from the browser. Only the club's owner, admins and officers may do it,
 * and only to an application that is still pending.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { memberId?: string };
  if (!body.memberId) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { data: member } = await supabaseAdmin
    .from("club_members")
    .select("id, club_id, user_id, email, display_name, status")
    .eq("id", body.memberId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  // Permission first, checked in code, before the service role touches anything.
  const { data: me } = await supabaseAdmin
    .from("club_members")
    .select("role")
    .eq("club_id", member.club_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me || !["owner", "admin", "officer"].includes(me.role as string)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  // Only applications. Removing an actual member is a different action.
  if (member.status !== "pending") {
    return NextResponse.json(
      { error: "That application was already handled." },
      { status: 409 }
    );
  }

  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("name, slug")
    .eq("id", member.club_id)
    .maybeSingle();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  // Work out where to email them while the row still exists.
  let to = (member.email as string | null) ?? null;
  if (!to && member.user_id) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(member.user_id as string);
    to = u?.user?.email ?? null;
  }

  const { error: delErr } = await supabaseAdmin
    .from("club_members")
    .delete()
    .eq("id", member.id)
    .eq("status", "pending");
  if (delErr) {
    // Supabase errors are plain objects, not Error instances.
    const msg = delErr.message || delErr.details || "Couldn't decline.";
    console.error("Decline application failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // The application is gone. From here on everything is best effort: a
  // hiccup sending the notice shouldn't look like the decline failed.
  const clubName = club.name as string;
  const reapplyPath = `/c/${club.slug}`;

  if (member.user_id) {
    const { error: noteErr } = await supabaseAdmin.from("notifications").insert({
      user_id: member.user_id,
      type: "club_declined",
      title: `About your ${clubName} application`,
      body: "Thanks for applying. We couldn't approve it this time, but you're welcome to apply again.",
      link: reapplyPath,
    });
    if (noteErr) console.error("Decline notification failed:", noteErr.message);
  }

  let emailed = false;
  if (to) {
    const firstName = ((member.display_name as string | null) ?? "").trim().split(/\s+/)[0] || null;
    const hi = firstName ? `Hi ${esc(firstName)}, thank` : "Thank";
    const safeClub = esc(clubName);
    emailed = await sendEmail({
      // A direct reply to something they did, so it goes out as
      // transactional mail (sendEmail's default), never bulk.
      kind: "club_declined",
      to,
      subject: `About your ${clubName} application`,
      html: emailLayout({
        preheader: "You're welcome to apply again any time.",
        title: "About your application",
        intro: `${hi} you for applying to the <strong>${safeClub}</strong>. We weren't able to approve your application this time. You're welcome to apply again whenever you like, and your Underground Aquarium account, classifieds and tools all keep working as before.`,
        bodyHtml: "",
        cta: { label: "Apply again", url: `${SITE}${reapplyPath}` },
        footerNote: `You're receiving this because you applied to the ${safeClub} on Underground Aquarium. Questions? support@undergroundaquarium.com`,
      }),
    });
  }

  return NextResponse.json({ ok: true, emailed });
}
