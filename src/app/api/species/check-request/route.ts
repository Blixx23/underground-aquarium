import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkSpeciesRequest } from "@/lib/species/checkRequest";

export const dynamic = "force-dynamic";
// The check itself runs after the reply, inside this function's time.
export const maxDuration = 300;

/**
 * Called by the species request form right after a member sends one, so the
 * AI check is done by the time Chris opens the queue. It only ever checks the
 * caller's own newest request, once, and at most a few a day per member, so
 * it can't be used to run up the bill. If it fails, the admin page checks the
 * request itself when Chris opens it.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: true, queued: false });

  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { data: mine } = await supabaseAdmin
    .from("species_suggestions")
    .select("id, status, ai_review, created_at")
    .eq("suggester_id", user.id)
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = (mine ?? []) as { id: string; status: string; ai_review: unknown; created_at: string }[];
  const newest = rows[0];
  const fresh = newest && Date.now() - new Date(newest.created_at).getTime() < 10 * 60_000;
  // Five background checks a day per member; anything past that waits for the admin page.
  const checkedToday = rows.filter((r) => r.ai_review).length;
  if (!newest || !fresh || newest.status !== "pending" || newest.ai_review || checkedToday >= 5) {
    return NextResponse.json({ ok: true, queued: false });
  }

  after(async () => {
    await checkSpeciesRequest(newest.id).catch(() => undefined);
  });
  return NextResponse.json({ ok: true, queued: true });
}
