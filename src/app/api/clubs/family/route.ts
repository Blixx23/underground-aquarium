import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailLayout } from "@/lib/email";

// Confirm the signed-in user is the MAIN member of a family membership in this
// club (tier "family" with no family_primary_id of their own). Returns their
// club_members row id, or null.
async function getMainMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
  userId: string
) {
  const { data: me } = await supabase
    .from("club_members")
    .select("id, tier, family_primary_id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!me || me.tier !== "family" || me.family_primary_id) return null;
  return me as { id: string };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const { clubId, email, name } = await request.json();
    if (!clubId) {
      return NextResponse.json({ error: "Missing club." }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Enter an email address." },
        { status: 400 }
      );
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || "").trim() || null;

    const me = await getMainMember(supabase, clubId, user.id);
    if (!me) {
      return NextResponse.json(
        { error: "Only a family membership's main member can add family." },
        { status: 403 }
      );
    }

    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("name, family_max")
      .eq("id", clubId)
      .maybeSingle();
    if (!club) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 });
    }
    const cap = club.family_max ?? 5;

    // Enforce the club's family cap.
    const { count } = await supabaseAdmin
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("family_primary_id", me.id);
    if ((count ?? 0) >= cap) {
      return NextResponse.json(
        { error: `You can add up to ${cap} family members.` },
        { status: 400 }
      );
    }

    // No duplicate emails on the same club roster.
    const { data: existing } = await supabaseAdmin
      .from("club_members")
      .select("id")
      .eq("club_id", clubId)
      .ilike("email", cleanEmail)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "That email is already on this club's roster." },
        { status: 400 }
      );
    }

    // Create the linked family member — active and covered by the main
    // member's dues. They link to their own login when they sign up with
    // this email.
    const { error: insErr } = await supabaseAdmin.from("club_members").insert({
      club_id: clubId,
      email: cleanEmail,
      display_name: cleanName,
      role: "member",
      tier: "family",
      status: "active",
      family_primary_id: me.id,
    });
    if (insErr) throw insErr;

    // Nudge them to create their account (lazy Resend init avoids build issues).
    const origin = new URL(request.url).origin;
    const link = `${origin}/register`;
    const clubName = club.name ?? "an aquarium club";
    let emailed = false;
    const key = process.env.RESEND_API_KEY;
    if (key) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(key);
        await resend.emails.send({
          from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
          to: cleanEmail,
          subject: `You've been added to ${clubName}`,
          html: emailLayout({
            preheader: `You're part of a family membership at ${clubName}`,
            title: "You're part of the family",
            intro: `You've been added to <strong>${clubName}</strong> as part of a family membership on Underground Aquarium. Create your free account using this email address and you'll be connected to the club automatically — no dues to pay, that's covered by your family's membership.`,
            cta: { label: "Create your account", url: link },
            footerNote: `Be sure to sign up with <strong>${cleanEmail}</strong> so we can link you to the club.`,
          }),
        });
        emailed = true;
      } catch (e) {
        console.error("Family invite email failed:", e);
      }
    }

    return NextResponse.json({ ok: true, emailed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Family add error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const me = await getMainMember(supabase, clubId, user.id);
    if (!me) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    // Only remove a member that belongs to THIS main member's family.
    const { error: delErr } = await supabaseAdmin
      .from("club_members")
      .delete()
      .eq("id", memberId)
      .eq("club_id", clubId)
      .eq("family_primary_id", me.id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Family remove error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
