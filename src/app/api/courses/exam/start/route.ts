import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MASTERY_TIME_LIMIT_MIN } from "@/lib/courses/mastery";
import { getMasteryStatus } from "@/lib/courses/masteryStatus";

/**
 * Starts (or resumes) a timed mastery exam. The clock lives here, on the
 * server: the browser only displays it, so changing the page's timer
 * changes nothing.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const status = await getMasteryStatus(user.id);
  if (!status || !status.sectionId) {
    return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  }
  if (status.passed) {
    return NextResponse.json({ error: "You've already passed this exam." }, { status: 409 });
  }
  if (!status.unlocked) {
    return NextResponse.json({ error: "Finish every beginner course to unlock this exam." }, { status: 403 });
  }
  if (status.retryAt) {
    return NextResponse.json({ error: "You can retake the exam later.", retryAt: status.retryAt }, { status: 429 });
  }
  if (status.openSession) {
    return NextResponse.json({ sessionId: status.openSession.id, expiresAt: status.openSession.expiresAt, resumed: true });
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + MASTERY_TIME_LIMIT_MIN * 60_000);
  const { data: session, error } = await supabaseAdmin
    .from("course_exam_sessions")
    .insert({
      user_id: user.id,
      course_id: status.courseId,
      section_id: status.sectionId,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, expires_at")
    .maybeSingle();
  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? "Couldn't start the exam." }, { status: 500 });
  }
  return NextResponse.json({ sessionId: session.id, expiresAt: session.expires_at, resumed: false });
}
