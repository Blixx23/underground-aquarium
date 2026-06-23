import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";

export async function POST(req: Request) {
  let body: { id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || (action !== "add" && action !== "dismiss")) {
    return NextResponse.json(
      { error: "Missing suggestion or action." },
      { status: 400 }
    );
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

  const status = action === "add" ? "added" : "dismissed";

  const { error } = await supabaseAdmin
    .from("species_suggestions")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reward the suggester when their species is accepted (deduped per suggestion).
  if (action === "add") {
    const { data: sugg } = await supabaseAdmin
      .from("species_suggestions")
      .select("suggester_id")
      .eq("id", id)
      .maybeSingle();
    const suggesterId = (sugg?.suggester_id as string | null) ?? null;
    if (suggesterId) {
      await awardBubbles(suggesterId, "species_approved", `species_sugg_${id}`);
    }
  }

  return NextResponse.json({ ok: true });
}
