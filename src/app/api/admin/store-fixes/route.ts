import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";
import { adminUnlocked, LOCKED_MESSAGE } from "@/lib/admin/unlockCheck";

/**
 * Admin marks a shop fix as fixed or dismissed. A fix that was right
 * ("Fixed") earns the member who sent it bubbles, once per fix, so filling in
 * the directory is worth people's time.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string; status?: string } | null;
  const id = body?.id;
  const status = body?.status;
  if (!id || (status !== "done" && status !== "dismissed")) {
    return NextResponse.json({ error: "Missing fix or decision." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  if (!(await adminUnlocked(user.id))) return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 403 });

  const { data: row, error } = await supabaseAdmin
    .from("store_edit_suggestions")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open")
    .select("user_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let bubbles = 0;
  if (status === "done" && row?.user_id && row.user_id !== user.id) {
    bubbles = await awardBubbles(row.user_id as string, "shop_fix_approved", `shop_fix_${id}`);
  }
  return NextResponse.json({ ok: true, bubbles });
}
