import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Admin only: tick a Top Stores winner's reward as sent, with an optional note. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: { quarter?: string; storeId?: string; sent?: boolean; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.quarter || !/^\d{4}-Q[1-4]$/.test(body.quarter) || !body.storeId) {
    return NextResponse.json({ error: "Which quarter and shop?" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body.sent === "boolean") patch.reward_sent_at = body.sent ? new Date().toISOString() : null;
  if (typeof body.note === "string") patch.reward_note = body.note.trim().slice(0, 500) || null;

  const { error } = await supabaseAdmin
    .from("top_shop_awards")
    .update(patch)
    .eq("quarter", body.quarter)
    .eq("store_id", body.storeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("top-shops", { expire: 0 });
  revalidatePath("/admin/top-shops");
  return NextResponse.json({ ok: true });
}
