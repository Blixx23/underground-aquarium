import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let body: { sectionId?: string; answers?: Record<string, number> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const sectionId = body.sectionId;
  const answers = body.answers ?? {};
  if (!sectionId) {
    return NextResponse.json({ error: "Missing section." }, { status: 400 });
  }

  // Verify the section belongs to a published course
  const { data: section } = await supabaseAdmin
    .from("course_sections")
    .select("id, course_id, courses(is_published)")
    .eq("id", sectionId)
    .maybeSingle();

  const published =
    section &&
    (Array.isArray((section as { courses?: unknown }).courses)
      ? ((section as { courses: { is_published: boolean }[] }).courses[0]
          ?.is_published ?? false)
      : ((section as { courses?: { is_published?: boolean } }).courses
          ?.is_published ?? false));

  if (!section || !published) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }
  const courseId = (section as { course_id: string }).course_id;

  // Grade against the hidden answer key (service role can read correct_index)
  const { data: questions } = await supabaseAdmin
    .from("course_questions")
    .select("id, correct_index")
    .eq("section_id", sectionId);

  const wrongQuestionIds: string[] = [];
  for (const q of questions ?? []) {
    if (answers[q.id] !== q.correct_index) wrongQuestionIds.push(q.id);
  }
  if (wrongQuestionIds.length > 0) {
    return NextResponse.json({ passed: false, wrongQuestionIds });
  }

  // Passed → record section progress
  await supabaseAdmin
    .from("course_section_progress")
    .upsert(
      { user_id: user.id, section_id: sectionId },
      { onConflict: "user_id,section_id" }
    );

  // Are all sections of the course now complete?
  const { data: allSecs } = await supabaseAdmin
    .from("course_sections")
    .select("id")
    .eq("course_id", courseId);
  const allIds = (allSecs ?? []).map((s) => s.id);

  const { data: doneRows } = await supabaseAdmin
    .from("course_section_progress")
    .select("section_id")
    .eq("user_id", user.id)
    .in("section_id", allIds);
  const doneCount = new Set((doneRows ?? []).map((d) => d.section_id)).size;
  const courseCompleted = allIds.length > 0 && doneCount >= allIds.length;

  let certificateCode: string | null = null;
  if (courseCompleted) {
    const { data: existing } = await supabaseAdmin
      .from("course_completions")
      .select("certificate_code")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();
    if (existing) {
      certificateCode = existing.certificate_code;
    } else {
      const { data: inserted } = await supabaseAdmin
        .from("course_completions")
        .insert({ user_id: user.id, course_id: courseId })
        .select("certificate_code")
        .maybeSingle();
      certificateCode = inserted?.certificate_code ?? null;
      // First time completing this course — reward it (also serves as the
      // "first certification" earn, since certifications are course completions).
      await awardBubbles(user.id, "course_completed", `course_${courseId}`);
    }
  }

  return NextResponse.json({ passed: true, courseCompleted, certificateCode });
}
