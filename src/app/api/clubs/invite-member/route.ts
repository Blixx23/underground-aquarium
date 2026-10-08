import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limit } from "@/lib/rateLimit";

type InviteTier = "individual" | "lifetime" | "honorary";

const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/**
 * Invite someone who already has an Underground Aquarium account, as a
 * yearly, lifetime or honorary member. Yearly and lifetime go on the roster
 * as a prospect and get a notification that takes them straight to paying;
 * paying makes them active. Honorary members are active right away and pay
 * nothing. Only the club's owner, admins and officers can do this.
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

  const body = (await request.json().catch(() => ({}))) as { clubId?: string; userId?: string; tier?: string };
  const clubId = typeof body.clubId === "string" ? body.clubId : "";
  const userId = typeof body.userId === "string" ? body.userId : "";
  const tier: InviteTier =
    body.tier === "lifetime" || body.tier === "honorary" ? body.tier : "individual";
  if (!clubId || !userId) return NextResponse.json({ error: "Pick someone to invite." }, { status: 400 });

  const { data: mine } = await supabaseAdmin
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mine || !["owner", "admin", "officer"].includes(mine.role as string)) {
    return NextResponse.json({ error: "Only the club's officers can invite members." }, { status: 403 });
  }

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

  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("name, slug, dues_amount_cents, lifetime_dues_amount_cents")
    .eq("id", clubId)
    .maybeSingle();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });
  if (tier === "lifetime" && !(club.lifetime_dues_amount_cents > 0)) {
    return NextResponse.json({ error: "Set a lifetime price for the club first." }, { status: 400 });
  }

  const { data: auth } = await supabaseAdmin.auth.admin.getUserById(userId);
  const { data: row, error: insErr } = await supabaseAdmin
    .from("club_members")
    .insert({
      club_id: clubId,
      user_id: userId,
      display_name: person.full_name || person.username || null,
      email: auth?.user?.email ?? null,
      role: "member",
      tier: tier === "individual" ? "individual" : "lifetime",
      status: tier === "honorary" ? "active" : "prospect",
    })
    .select("id")
    .single();
  if (insErr || !row) return NextResponse.json({ error: insErr?.message || "Couldn't add them." }, { status: 500 });

  if (tier === "honorary") {
    // Through the officer's own session: the database checks they're allowed.
    const { error: honErr } = await supabase.rpc("grant_honorary_lifetime", { p_member: row.id });
    if (honErr) {
      await supabaseAdmin.from("club_members").delete().eq("id", row.id);
      return NextResponse.json({ error: honErr.message || "Couldn't make them honorary." }, { status: 400 });
    }
  }

  const note =
    tier === "honorary"
      ? {
          type: "club_honorary",
          title: `You're an honorary lifetime member of ${club.name}`,
          body: "No dues, ever. Welcome in.",
          link: `/c/${club.slug}`,
        }
      : {
          type: "club_invite",
          title: `You're invited to join ${club.name}`,
          body:
            tier === "lifetime"
              ? `Lifetime membership: ${money(club.lifetime_dues_amount_cents)} once. Tap to pay and you're in.`
              : `Yearly membership: ${money(club.dues_amount_cents)}. Tap to pay and you're in.`,
          link: `/c/${club.slug}#renew`,
        };
  await supabaseAdmin.from("notifications").insert({ user_id: userId, ...note });

  return NextResponse.json({ ok: true, label, memberId: row.id, honorary: tier === "honorary" });
}
