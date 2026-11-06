import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSpeciesRequest } from "@/lib/species/checkRequest";

export const dynamic = "force-dynamic";
// Two careful passes that can search the web.
export const maxDuration = 300;

/**
 * Admin only. The AI check for one species request: { id, force? }.
 * A saved check is returned as is unless force is set (Check again). Saving
 * needs step70 SQL; without it the check still works, it just isn't kept.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: { id?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Which request?" }, { status: 400 });

  // Not forced: use the saved check, or wait for the background one that
  // started when the member sent it; this check steps in if it never arrives.
  const result = await checkSpeciesRequest(body.id, { force: body.force, waitForBackground: !body.force });
  return result.ok
    ? NextResponse.json({ ok: true, review: result.review, saved: result.saved })
    : NextResponse.json({ error: result.error }, { status: result.status });
}
