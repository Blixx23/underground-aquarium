import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";
import { questionsToAsk, isExamSection, EXAM_PASS_PERCENT } from "@/lib/courses/quiz";
import { canTakeMembersCourses, courseAccessInfo } from "@/lib/courses/access";

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

  // Verify the section belongs to a published course. Looked up in plain
  // separate queries: the old embedded join also asked for courses.pass_percent,
  // and when that column doesn't exist the whole query fails, so every quiz
  // answered "Section not found." no matter what you picked.
  const { data: section } = await supabaseAdmin
    .from("course_sections")
    .select("id, title, course_id")
    .eq("id", sectionId)
    .maybeSingle();
  if (!section) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }
  const courseId = section.course_id as string;

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("is_published")
    .eq("id", courseId)
    .maybeSingle();
  if (!course?.is_published) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }

  // Society classes can only be taken by members in good standing.
  const access = await courseAccessInfo(courseId);
  if (access.members_only && !(await canTakeMembersCourses())) {
    return NextResponse.json({ error: "This class is for Society members." }, { status: 403 });
  }

  // Optional per-course pass mark. If the column isn't there, the error is
  // ignored and the course needs 100%, which is how every course has worked.
  let passPercentRaw: number | null = null;
  {
    const { data: pp, error: ppErr } = await supabaseAdmin
      .from("courses")
      .select("pass_percent")
      .eq("id", courseId)
      .maybeSingle();
    if (!ppErr) passPercentRaw = (pp as { pass_percent?: number | null } | null)?.pass_percent ?? null;
  }

  // Grade against the hidden answer key (service role can read correct_index)
  // Only the questions the lesson actually shows are graded (see
  // questionsToAsk): same ordering as the learn page, so they always match.
  const { data: allQuestions } = await supabaseAdmin
    .from("course_questions")
    .select("id, correct_index")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  const questions = questionsToAsk(section.title as string, allQuestions ?? []);

  const wrongQuestionIds: string[] = [];
  for (const q of questions ?? []) {
    if (answers[q.id] !== q.correct_index) wrongQuestionIds.push(q.id);
  }

  // How much of it you have to get right. Lesson checks default to 100
  // (fix it until it's right). A final exam is graded once at 80%.
  const isExam = isExamSection(section.title as string);
  const passPercent = isExam
    ? EXAM_PASS_PERCENT
    : Math.min(100, Math.max(1, Number(passPercentRaw ?? 100)));

  const total = (questions ?? []).length;
  const correct = total - wrongQuestionIds.length;
  // No questions on a section means reading it is the whole requirement.
  const scored = total === 0 ? 100 : Math.round((correct / total) * 100);

  // Exams: record every attempt, and once it's graded show the right answer
  // for anything missed (the attempt is already on file, so nothing to game).
  let correctAnswers: Record<string, number> | undefined;
  if (isExam) {
    correctAnswers = Object.fromEntries((questions ?? []).map((q) => [q.id, q.correct_index as number]));
    const { error: attemptErr } = await supabaseAdmin.from("course_exam_attempts").insert({
      user_id: user.id,
      course_id: courseId,
      section_id: sectionId,
      correct,
      total,
      score: scored,
      passed: scored >= passPercent,
      answers,
    });
    if (attemptErr) console.error("course_exam_attempts insert failed", attemptErr.message);
  }

  if (scored < passPercent) {
    return NextResponse.json({
      exam: isExam,
      correctAnswers,
      passed: false,
      wrongQuestionIds,
      correct,
      total,
      scored,
      passPercent,
    });
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

  return NextResponse.json({
    exam: isExam,
    correctAnswers,
    passed: true,
    courseCompleted,
    certificateCode,
    // Passing at 80 can still leave a couple wrong; say which, so the
    // learner sees what they missed instead of just a green tick.
    wrongQuestionIds,
    correct,
    total,
    scored,
    passPercent,
  });
}
