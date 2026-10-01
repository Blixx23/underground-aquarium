import Link from "next/link";
import {
  GraduationCap,
  Award,
  Clock,
  ScrollText,
  ArrowRight,
  BadgeCheck,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { COURSE_GROUPS, courseGroup, type CourseGroup } from "@/lib/courses/levels";
import { canTakeMembersCourses } from "@/lib/courses/access";
import SocietySeal from "@/components/society/SocietySeal";
import { SOCIETY_PATH } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Free Aquarium Courses for Beginners",
  alternates: { canonical: "/courses" },
  description:
    "Free, guided aquarium courses from Underground Aquarium. Learn the hobby the right way, pass the quizzes, and earn a certificate and a profile badge.",
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  est_minutes: number;
  badge_title: string;
  level?: string | null;
  members_only?: boolean | null;
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const wantedLevel = (await searchParams).level;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // level and members_only arrive with course_levels.sql; until then every
  // course reads as an open beginner course.
  const baseCols = "id, slug, title, subtitle, est_minutes, badge_title";
  const withLevels = await supabase
    .from("courses")
    .select(`${baseCols}, level, members_only`)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  let courseData: unknown[] | null = withLevels.data;
  if (withLevels.error) {
    const { data } = await supabase
      .from("courses")
      .select(baseCols)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    courseData = data;
  }

  const allCourses = (courseData ?? []) as CourseRow[];

  // The menu only lists groups that have a course in them.
  const groups = COURSE_GROUPS.map((g) => ({
    ...g,
    courses: allCourses.filter((c) => courseGroup(c) === g.key),
  })).filter((g) => g.courses.length > 0);
  const activeGroup =
    groups.find((g) => g.key === wantedLevel) ?? groups[0] ?? null;
  const courses = activeGroup?.courses ?? [];
  const isSocietyGroup = activeGroup?.key === ("society" as CourseGroup);
  const membersAccess = groups.some((g) => g.key === "society")
    ? await canTakeMembersCourses()
    : false;
  const ids = courses.map((c) => c.id);

  // Lesson counts
  const lessonCount: Record<string, number> = {};
  if (ids.length) {
    const { data: secs } = await supabase
      .from("course_sections")
      .select("id, course_id")
      .in("course_id", ids);
    for (const s of secs ?? []) {
      lessonCount[s.course_id] = (lessonCount[s.course_id] ?? 0) + 1;
    }
  }

  // Which courses this user has finished
  const completed = new Set<string>();
  if (user && ids.length) {
    const { data: comps } = await supabase
      .from("course_completions")
      .select("course_id")
      .eq("user_id", user.id);
    for (const c of comps ?? []) completed.add(c.course_id);
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-ocean-400 mb-3">
          Underground Aquarium
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-white glow-text mb-4">
          Courses
        </h1>
        <p className="text-ocean-300 text-lg max-w-2xl mb-10">
          Free, guided courses to learn the hobby the right way. Work through
          short lessons, pass the quizzes as you go, and earn a certificate and
          a badge for your profile.
        </p>

        {/* Level menu: only the levels that have courses */}
        {groups.length > 0 && (
          <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-ocean-800/60">
            {groups.map((g) => {
              const active = g.key === activeGroup?.key;
              const society = g.key === "society";
              return (
                <Link
                  key={g.key}
                  href={g.key === groups[0].key ? "/courses" : `/courses?level=${g.key}`}
                  scroll={false}
                  className={`relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? society
                        ? "text-amber-200"
                        : "text-white"
                      : society
                      ? "text-amber-300/70 hover:text-amber-200"
                      : "text-ocean-400 hover:text-white"
                  }`}
                >
                  {society && <SocietySeal size={16} className="h-4 w-4" />}
                  {g.label}
                  <span className="text-ocean-500">{g.courses.length}</span>
                  {active && (
                    <span
                      className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full ${
                        society ? "bg-amber-400" : "bg-ocean-400"
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        )}
        {activeGroup && (
          <p className={`mb-6 text-sm ${isSocietyGroup ? "text-amber-100/70" : "text-ocean-400"}`}>
            {activeGroup.blurb}
            {isSocietyGroup && !membersAccess && (
              <>
                {" "}
                <Link href={SOCIETY_PATH} className="text-amber-300 hover:text-amber-200">
                  Join the Society
                </Link>{" "}
                to take them.
              </>
            )}
          </p>
        )}

        {courses.length === 0 ? (
          <div className="card-deep rounded-2xl p-10 text-center">
            <GraduationCap className="w-8 h-8 text-ocean-400 mx-auto mb-3" />
            <p className="text-ocean-300">
              The first courses are being prepared. Check back soon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {courses.map((c) => {
              const isDone = completed.has(c.id);
              const lessons = lessonCount[c.id] ?? 0;
              const locked = !!c.members_only && !membersAccess;
              return (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className={`group block card-deep rounded-2xl p-6 sm:p-8 transition-all ${
                    c.members_only ? "ring-1 ring-amber-500/30" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    {/* Emblem */}
                    <div className="relative w-16 h-16 shrink-0">
                      <div
                        className={
                          "absolute inset-0 rounded-full animate-glow-pulse " +
                          (isDone ? "bg-emerald-500/20" : "bg-ocean-600/25")
                        }
                      />
                      <div className="relative z-10 flex items-center justify-center w-full h-full">
                        {isDone ? (
                          <BadgeCheck className="w-7 h-7 text-emerald-300" />
                        ) : (
                          <GraduationCap className="w-7 h-7 text-ocean-200" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 text-xs font-mono uppercase tracking-[0.2em] text-ocean-400">
                        <Award className="w-3.5 h-3.5" />
                        {c.badge_title}
                      </div>
                      <h2 className="font-display text-2xl text-white group-hover:text-ocean-100 transition-colors">
                        {c.title}
                      </h2>
                      {c.subtitle && (
                        <p className="text-ocean-300 mt-1">{c.subtitle}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-ocean-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> ~{c.est_minutes} min
                        </span>
                        {lessons > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <ScrollText className="w-4 h-4" /> {lessons} lessons
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <Award className="w-4 h-4" /> Certificate + badge
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0">
                      {isDone ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-200 px-5 py-2.5 text-sm font-medium">
                          <BadgeCheck className="w-4 h-4" /> Completed
                        </span>
                      ) : locked ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-200 px-5 py-2.5 text-sm font-medium">
                          <Lock className="w-4 h-4" /> Members only
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-ocean-600 group-hover:bg-ocean-500 text-white px-5 py-2.5 text-sm font-medium transition-colors">
                          Start course
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
