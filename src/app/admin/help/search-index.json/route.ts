import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHelpSections } from "@/lib/help/content";

/**
 * Admin help search index. Route handlers don't pass through the /admin
 * layout, so this checks is_admin itself and never lets the response be
 * cached anywhere shared.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(getHelpSections("admin"), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
