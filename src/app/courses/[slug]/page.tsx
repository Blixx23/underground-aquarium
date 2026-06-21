import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  ScrollText,
  Award,
  Play,
  BookOpen,
  Check,
  Film,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("title, subtitle, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!course) return { title: "Course — Underground Aquarium" };
  return {
    title: `${course.title} — Underground Aquarium`,
    description:
      course.description ?? course.subtitle ?? undefined,
  };
}

export default async function CourseLandingPage({
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
    .select("id, title, has_video, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });
  const sections = sectionRows ?? [];

  const completedIds = new Set<string>();
  let courseDone = false;
  if (user && sections.length) {
    const ids = sections.map((s) => s.id);
    const { data: prog } = await supabase
      .from("course_section_progress")
      .select("section_id")
      .eq("user_id", user.id)
      .in("section_id", ids);
    for (const p of prog ?? []) completedIds.add(p.section_id);

    const { data: comp } = await supabase
      .from("course_completions")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();
    courseDone = !!comp;
  }

  const completedCount = completedIds.size;
  const inProgress = completedCount > 0 && !courseDone;
  const learnHref = `/courses/${course.slug}/learn`;
  const certHref = `/courses/${course.slug}/certificate`;

  const cta = courseDone ? (
    <>
      <BookOpen className="w-5 h-5" /> Review the course
    </>
  ) : inProgress ? (
    <>
      <Play className="w-5 h-5" /> Continue course
    </>
  ) : (
    <>
      <Play className="w-5 h-5" /> Start course
    </>
  );

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Courses
        </Link>

        {/* Hero */}
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-ocean-400 mb-3">
          Underground Aquarium Society · Free course
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-white glow-text mb-4">
          {course.title}
        </h1>
        {course.subtitle && (
          <p className="text-ocean-200 text-xl mb-5">{course.subtitle}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ocean-400 mb-6">
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
        {course.description && (
          <p className="text-ocean-300 text-lg leading-relaxed mb-8 max-w-2xl">
            {course.description}
          </p>
        )}

        {/* CTA */}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={learnHref}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 text-white px-7 py-3 text-base font-medium transition-colors"
          >
            {cta}
          </Link>
          {courseDone && (
            <Link
              href={certHref}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 text-amber-100 hover:bg-amber-300/10 px-6 py-3 text-sm transition-colors"
            >
              <Award className="w-4 h-4" /> View certificate
            </Link>
          )}
        </div>
        {inProgress && (
          <p className="text-sm text-ocean-400 mt-3">
            {completedCount} of {sections.length} lessons complete
          </p>
        )}
        <p className="text-sm text-ocean-500 mt-3 mb-14">
          Free · No prior experience needed
        </p>

        {/* Curriculum */}
        {sections.length > 0 && (
          <>
            <h2 className="font-display text-2xl text-white mb-4">
              What you&apos;ll learn
            </h2>
            <ol className="space-y-2 mb-14">
              {sections.map((s, i) => {
                const done = completedIds.has(s.id);
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-ocean-800/60 bg-ocean-900/30 px-4 py-3"
                  >
                    <span className="shrink-0">
                      {done ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full border border-ocean-700 text-[11px] text-ocean-300">
                          {i + 1}
                        </span>
                      )}
                    </span>
                    <span className="flex-1 text-ocean-100">{s.title}</span>
                    {s.has_video && (
                      <Film className="w-4 h-4 text-ocean-500 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {/* Certificate */}
        <div className="card-deep rounded-2xl p-6 sm:p-8 flex items-start gap-5 mb-12">
          <div className="relative w-14 h-14 shrink-0">
            <div className="absolute inset-0 rounded-full bg-amber-400/10 animate-glow-pulse" />
            <div className="absolute inset-0 rounded-full border border-amber-300/30" />
            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <Award className="w-6 h-6 text-amber-200" />
            </div>
          </div>
          <div>
            <h3 className="font-display text-xl text-white mb-1">
              Earn your certificate
            </h3>
            <p className="text-ocean-300">
              Finish every lesson and pass the quizzes to earn a shareable
              certificate and a &ldquo;{course.badge_title}&rdquo; badge on your
              profile.
            </p>
          </div>
        </div>

        {/* Closing CTA */}
        <div className="text-center">
          <Link
            href={learnHref}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 text-white px-7 py-3 text-base font-medium transition-colors"
          >
            {cta}
          </Link>
        </div>
      </div>
    </main>
  );
}
