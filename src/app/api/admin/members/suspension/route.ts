import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { unsuspendMember } from "../_lib/suspension";

/**
 * Admin-only: lift a member's suspension. Suspending happens from a profile
 * report on /admin/reports; this is the undo, used by the Suspended accounts
 * list on the same page.
 */
export async function POST(req: Request) {
  let body: { user_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const memberId = typeof body.user_id === "string" ? body.user_id : "";
  if (!memberId || body.action !== "unsuspend") {
    return NextResponse.json({ error: "Missing member or action." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { data: member } = await supabaseAdmin
    .from("profiles")
    .select("id, suspended_at")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const result = await unsuspendMember(memberId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Let the member know they are back. Best-effort: a failed notification
  // should not undo the unsuspend.
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: memberId,
      type: "moderation",
      title: "Account restored",
      body: "Your account suspension has been lifted. You can sign in again.",
      link: "/profile",
    });
  } catch {
    // ignore, see note above
  }

  return NextResponse.json({ ok: true, ads: result.ads, tanks: result.tanks });
}
