import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Admin-only typeahead for picking a member by username.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().replace(/^@/, "");
  if (q.length < 1) {
    return NextResponse.json({ members: [] });
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

  // Escape ILIKE wildcards in the user's input so they're treated literally.
  const safe = q.replace(/[%_\\]/g, (m) => `\\${m}`);

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("username, full_name, bubble_balance")
    .ilike("username", `%${safe}%`)
    .not("username", "is", null)
    .is("deleted_at", null)
    .order("username", { ascending: true })
    .limit(8);

  const members = (data ?? []).map((p) => ({
    username: p.username as string,
    full_name: (p.full_name as string | null) ?? null,
    bubble_balance: (p.bubble_balance as number) ?? 0,
  }));

  return NextResponse.json({ members });
}
