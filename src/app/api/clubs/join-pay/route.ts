import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Signing up from the website: once the application form is in, the member
 * pays right away. No officer approval and no invoices. This moves the
 * person's own fresh application from "pending" to "prospect", which is what
 * the dues checkout accepts; paying then makes them active. If the club
 * can't take payments right now, it stays an application for an officer.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { clubId?: string };
  const clubId = typeof body.clubId === "string" ? body.clubId : "";
  if (!clubId) return NextResponse.json({ error: "Missing club." }, { status: 400 });

  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("id, dues_amount_cents, lifetime_dues_amount_cents, stripe_account_id, payouts_enabled")
    .eq("id", clubId)
    .maybeSingle();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const { data: me } = await supabaseAdmin
    .from("club_members")
    .select("id, status, tier")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "Fill in the form first." }, { status: 400 });
  if (me.status !== "pending") return NextResponse.json({ ok: true, pay: me.status === "prospect" });

  const price = me.tier === "lifetime" ? club.lifetime_dues_amount_cents ?? 0 : club.dues_amount_cents ?? 0;
  const canCollect = Boolean(club.stripe_account_id) && club.payouts_enabled && price > 0;
  if (!canCollect) return NextResponse.json({ ok: true, pay: false });

  const { error } = await supabaseAdmin
    .from("club_members")
    .update({ status: "prospect" })
    .eq("id", me.id)
    .eq("user_id", user.id)
    .eq("status", "pending");
  if (error) return NextResponse.json({ error: "Couldn't get your payment ready. Try again." }, { status: 500 });

  return NextResponse.json({ ok: true, pay: true });
}
