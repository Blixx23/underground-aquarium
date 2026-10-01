import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Award, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import CoursePlayer from "../../CoursePlayer";
import { questionsToAsk } from "@/lib/courses/quiz";
import { canTakeMembersCourses, courseAccessInfo } from "@/lib/courses/access";
import { SOCIETY_PATH } from "@/lib/config";
import MasteryExam from "@/components/courses/MasteryExam";
import {
  isMasterySlug,
  MASTERY_COOLDOWN_HOURS,
  MASTERY_PASS_PERCENT,
  MASTERY_TIME_LIMIT_MIN,
} from "@/lib/courses/mastery";
import { getMasteryStatus } from "@/lib/courses/masteryStatus";
import SocietySeal from "@/components/society/SocietySeal";

export const dynamic = "force-dynamic";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  sort_order: number;
};

type Section = {
  id: string;
  title: string;
  content: string;
  has_video: boolean;
  video_url: string | null;
  image_url: string | null;
  sort_order: number;
  questions: Question[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("title, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!course) return { title: "Course — Underground Aquarium" };
  return {
    title: `${course.title} — Underground Aquarium`,
    description: course.description ?? undefined,
    robots: { index: false },
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, subtitle, description, est_minutes, badge_title")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!course) notFound();

  // The mastery exam has its own page: locked until every beginner course
  // is done, then a timed, graded-once test.
  if (isMasterySlug(course.slug)) {
    const status = await getMasteryStatus(user?.id ?? null);
    if (!status || !status.sectionId) notFound();
    // Questions only reach the browser once the exam is actually open to this
    // person. They're read with the service client because the public can't
    // read mastery questions at all (see mastery_exam.sql), and the answer
    // key (correct_index) is never selected.
    const canSee = status.unlocked && !status.passed && !status.retryAt;
    const { data: qRows } = canSee
      ? await supabaseAdmin.from("course_questions").select("id, prompt, options").eq("section_id", status.sectionId)
      : { data: [] as { id: string; prompt: string; options: string[] }[] };
    const masteryQuestions = canSee
      ? (qRows ?? []).map((q) => ({ id: q.id as string, prompt: q.prompt as string, options: (q.options ?? []) as string[] }))
      : [];
    let profileHref: string | null = null;
    if (user) {
      const { data: me } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
      if (me?.username) profileHref = `/u/${me.username}`;
    }
    let passPercent = MASTERY_PASS_PERCENT;
    {
      const { data: pp, error: ppErr } = await supabase.from("courses").select("pass_percent").eq("id", course.id).maybeSingle();
      const v = !ppErr ? (pp as { pass_percent?: number | null } | null)?.pass_percent : null;
      if (v) passPercent = v;
    }
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Courses
          </Link>
          <MasteryExam
            title={course.title}
            badgeTitle={course.badge_title}
            sectionId={status.sectionId}
            questions={masteryQuestions}
            status={{
              unlocked: status.unlocked,
              passed: status.passed,
              retryAt: status.retryAt,
              bestScore: status.bestScore,
              attempts: status.attempts,
              requirements: status.requirements,
              openSession: status.openSession,
            }}
            signedIn={!!user}
            passPercent={passPercent}
            timeLimitMin={MASTERY_TIME_LIMIT_MIN}
            cooldownHours={MASTERY_COOLDOWN_HOURS}
            certHref={`/courses/${course.slug}/certificate`}
            profileHref={profileHref}
          />
        </div>
      </main>
    );
  }

  // Society classes: members in good standing (and admins) only.
  const access = await courseAccessInfo(course.id);
  if (access.members_only && !(await canTakeMembersCourses())) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-xl mx-auto text-center rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-10">
          <SocietySeal size={56} className="mx-auto mb-4 h-14 w-14" />
          <h1 className="font-display text-3xl text-amber-50 mb-2">{course.title}</h1>
          <p className="text-amber-100/70 mb-6">
            This class is for Underground Aquarium Society members.
          </p>
          <Link
            href={user ? SOCIETY_PATH : `/login?redirect=/courses/${slug}/learn`}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-400 px-6 py-2.5 text-sm font-medium text-ocean-950 transition-colors"
          >
            {user ? "Join the Society" : "Sign in"}
          </Link>
        </div>
      </main>
    );
  }

  const { data: sectionRows } = await supabase
    .from("course_sections")
    .select("id, title, content, has_video, video_url, image_url, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  const secs = sectionRows ?? [];
  const sectionIds = secs.map((s) => s.id);

  // Questions (no correct_index — the answer key never reaches the browser)
  const qBySection: Record<string, Question[]> = {};
  if (sectionIds.length) {
    const { data: questionRows } = await supabase
      .from("course_questions")
      .select("id, section_id, prompt, options, sort_order")
      .in("section_id", sectionIds)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    for (const q of questionRows ?? []) {
      (qBySection[q.section_id] ||= []).push({
        id: q.id,
        prompt: q.prompt,
        options: (q.options ?? []) as string[],
        sort_order: q.sort_order,
      });
    }
  }

  const sections: Section[] = secs.map((s) => ({
    id: s.id,
    title: s.title,
    content: s.content ?? "",
    has_video: !!s.has_video,
    video_url: s.video_url,
    image_url: s.image_url ?? null,
    sort_order: s.sort_order,
    questions: questionsToAsk(s.title, qBySection[s.id] ?? []),
  }));

  // Progress for this user
  let completed: string[] = [];
  let courseDone = false;
  if (user && sectionIds.length) {
    const { data: prog } = await supabase
      .from("course_section_progress")
      .select("section_id")
      .eq("user_id", user.id)
      .in("section_id", sectionIds);
    completed = (prog ?? []).map((p) => p.section_id);

    const { data: comp } = await supabase
      .from("course_completions")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();
    courseDone = !!comp;
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href={`/courses/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Course overview
        </Link>

        <p className="text-xs font-mono uppercase tracking-[0.2em] text-ocean-400 mb-2 flex items-center gap-2">
          <Award className="w-3.5 h-3.5" /> {course.badge_title}
        </p>
        <h1 className="font-display text-4xl text-white mb-3">{course.title}</h1>
        {course.subtitle && (
          <p className="text-ocean-300 text-lg mb-3">{course.subtitle}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ocean-400 mb-10">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> ~{course.est_minutes} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ScrollText className="w-4 h-4" /> {sections.length} lessons
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Award className="w-4 h-4" /> Certificate + profile badge
          </span>
        </div>

        {sections.length === 0 ? (
          <div className="card-deep rounded-2xl p-10 text-center text-ocean-300">
            This course is being prepared. Check back soon.
          </div>
        ) : (
          <CoursePlayer
            courseSlug={course.slug}
            badgeTitle={course.badge_title}
            sections={sections}
            initialCompleted={completed}
            signedIn={!!user}
            courseAlreadyDone={courseDone}
          />
        )}
      </div>
    </main>
  );
}
