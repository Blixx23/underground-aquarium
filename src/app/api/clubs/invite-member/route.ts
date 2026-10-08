import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limit } from "@/lib/rateLimit";

/**
 * Invite someone who already has an Underground Aquarium account. They get a
 * bell notification with a one-tap join link (and an email, if their
 * notification settings say so). create_invite checks, in the database, that
 * the person inviting is an officer of the club.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  {
    const limited = await limit("invite", request, user?.id);
    if (limited) return limited;
  }
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { clubId?: string; userId?: string };
  const clubId = typeof body.clubId === "string" ? body.clubId : "";
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!clubId || !userId) return NextResponse.json({ error: "Pick someone to invite." }, { status: 400 });

  const { data: person } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, deleted_at, suspended_at")
    .eq("id", userId)
    .maybeSingle();
  if (!person || person.deleted_at || person.suspended_at) {
    return NextResponse.json({ error: "That member can't be invited." }, { status: 404 });
  }
  const label = person.username ? `@${person.username}` : person.full_name || "They";

  const { data: already } = await supabaseAdmin
    .from("club_members")
    .select("id, status")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();
  if (already) {
    return NextResponse.json({ error: `${label} is already on the roster (${already.status}).` }, { status: 409 });
  }

  const { data: auth } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = auth?.user?.email;
  if (!email) return NextResponse.json({ error: `${label} has no email on their account.` }, { status: 400 });

  const { data: token, error: rpcErr } = await supabase.rpc("create_invite", {
    p_club_id: clubId,
    p_email: email,
    p_role: "member",
  });
  if (rpcErr || !token) {
    const msg = rpcErr && /not allowed/i.test(rpcErr.message)
      ? "You don't have permission to invite for this club."
      : rpcErr?.message || "Couldn't create the invite.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { data: club } = await supabaseAdmin.from("clubs").select("name").eq("id", clubId).maybeSingle();
  const clubName = club?.name ?? "the club";

  const { error: noteErr } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    type: "club_invite",
    title: `You're invited to join ${clubName}`,
    body: "Tap to join. It takes one tap.",
    link: `/join/${token}`,
  });
  if (noteErr) return NextResponse.json({ error: "The invite was made but the notification didn't send. Try again." }, { status: 500 });

  return NextResponse.json({ ok: true, label });
}
