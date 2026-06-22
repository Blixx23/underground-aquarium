import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    const { clubId, email, role } = await request.json();
    if (!clubId || !email || !email.trim()) {
      return NextResponse.json({ error: "Enter an email to invite." }, { status: 400 });
    }

    // create_invite enforces (in the database) that the caller is an officer.
    const { data: token, error: rpcErr } = await supabase.rpc("create_invite", {
      p_club_id: clubId,
      p_email: email.trim(),
      p_role: role || "member",
    });
    if (rpcErr) {
      const msg = /not allowed/i.test(rpcErr.message)
        ? "You don't have permission to invite for this club."
        : rpcErr.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { data: club } = await supabase
      .from("clubs")
      .select("name, slug")
      .eq("id", clubId)
      .maybeSingle();

    const origin = new URL(request.url).origin;
    const link = `${origin}/join/${token}`;
    const clubName = club?.name ?? "an aquarium club";

    // Send the email only if Resend is configured (lazy init avoids build issues).
    let emailed = false;
    const key = process.env.RESEND_API_KEY;
    if (key) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(key);
        await resend.emails.send({
          from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
          to: email.trim(),
          subject: `You're invited to join ${clubName}`,
          html: emailLayout({
            preheader: `You're invited to join ${clubName} on Underground Aquarium`,
            title: "You're invited",
            intro: `You've been invited to join <strong>${clubName}</strong> on Underground Aquarium.`,
            cta: { label: "Join the club", url: link },
            footerNote: `Or paste this link into your browser:<br><a href="${link}" style="color:#0e6e8c;text-decoration:none;word-break:break-all;">${link}</a>`,
          }),
        });
        emailed = true;
      } catch (e) {
        console.error("Invite email failed:", e);
      }
    }

    return NextResponse.json({ ok: true, link, emailed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Invite error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
