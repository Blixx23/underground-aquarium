import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailLayout } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const { clubId, memberId } = await request.json();
    if (!clubId || !memberId) {
      return NextResponse.json({ error: "Missing data." }, { status: 400 });
    }

    // Caller must be an officer/admin/owner of this club.
    const { data: meRow } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();
    const isOfficer =
      meRow && ["owner", "admin", "officer"].includes(meRow.role);
    if (!isOfficer) {
      return NextResponse.json(
        { error: "You don't have permission to do that." },
        { status: 403 }
      );
    }

    // Find the target member in this club.
    const { data: target } = await supabaseAdmin
      .from("club_members")
      .select("id, email, user_id, club_id, family_primary_id")
      .eq("id", memberId)
      .maybeSingle();
    if (!target || target.club_id !== clubId) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
    if (target.family_primary_id) {
      return NextResponse.json(
        { error: "That member's dues are covered by their family membership." },
        { status: 400 }
      );
    }

    // Resolve where to send it.
    let to = target.email;
    if (!to && target.user_id) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(
        target.user_id
      );
      to = u?.user?.email ?? null;
    }
    if (!to) {
      return NextResponse.json(
        { error: "No email on file for this member." },
        { status: 400 }
      );
    }

    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("name, slug")
      .eq("id", clubId)
      .maybeSingle();
    if (!club) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const link = `${origin}/c/${club.slug}`;
    const clubName = club.name ?? "your aquarium club";

    let emailed = false;
    const key = process.env.RESEND_API_KEY;
    if (key) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(key);
        await resend.emails.send({
          from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
          to,
          subject: `Membership dues for ${clubName}`,
          html: emailLayout({
            preheader: `Pay your ${clubName} membership dues`,
            title: "Membership dues",
            intro: `Your membership dues for <strong>${clubName}</strong> are ready to pay. You can take care of it in a moment on the club page.`,
            cta: { label: "Pay your dues", url: link },
            footerNote: `Or open this link in your browser:<br><a href="${link}" style="color:#0e6e8c;text-decoration:none;word-break:break-all;">${link}</a>`,
          }),
        });
        emailed = true;
      } catch (e) {
        console.error("Dues request email failed:", e);
      }
    }

    return NextResponse.json({ ok: true, emailed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Dues request error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
