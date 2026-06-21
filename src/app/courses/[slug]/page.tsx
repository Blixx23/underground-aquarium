import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Award, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CoursePlayer from "../CoursePlayer";

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

  const { data: sectionRows } = await supabase
    .from("course_sections")
    .select("id, title, content, has_video, video_url, sort_order")
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
      .order("sort_order", { ascending: true });
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
    sort_order: s.sort_order,
    questions: qBySection[s.id] ?? [],
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
          href="/courses"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Courses
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
