import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Records that the exam tab was hidden (switched away from) during a session. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: "Missing session." }, { status: 400 });

  const { data: s } = await supabaseAdmin
    .from("course_exam_sessions")
    .select("id, user_id, focus_losses, submitted_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s || s.user_id !== user.id || s.submitted_at) return NextResponse.json({ ok: true });

  await supabaseAdmin
    .from("course_exam_sessions")
    .update({ focus_losses: (Number(s.focus_losses) || 0) + 1 })
    .eq("id", sessionId);
  return NextResponse.json({ ok: true });
}
