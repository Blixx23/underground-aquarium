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
import MasteryEmblem from "@/components/courses/MasteryEmblem";
import { isMasterySlug } from "@/lib/courses/mastery";
import { getMasteryStatus } from "@/lib/courses/masteryStatus";

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
  cover_image?: string | null;
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
  const baseCols = "id, slug, title, subtitle, est_minutes, badge_title, cover_image";
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

  const rows = (courseData ?? []) as CourseRow[];
  // The mastery exam gets its own glowing tile, not a regular card.
  const masteryCourse = rows.find((c) => isMasterySlug(c.slug)) ?? null;
  const allCourses = rows.filter((c) => !isMasterySlug(c.slug));
  const mastery = masteryCourse ? await getMasteryStatus(user?.id ?? null) : null;

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

  // Lesson counts, and which lesson belongs to which course (for progress)
  const lessonCount: Record<string, number> = {};
  const courseOfSection: Record<string, string> = {};
  if (ids.length) {
    const { data: secs } = await supabase
      .from("course_sections")
      .select("id, course_id")
      .in("course_id", ids);
    for (const s of secs ?? []) {
      lessonCount[s.course_id] = (lessonCount[s.course_id] ?? 0) + 1;
      courseOfSection[s.id] = s.course_id;
    }
  }

  // How far the signed-in member is through each course
  const doneLessons: Record<string, number> = {};
  const sectionIds = Object.keys(courseOfSection);
  if (user && sectionIds.length) {
    const { data: prog } = await supabase
      .from("course_section_progress")
      .select("section_id")
      .eq("user_id", user.id)
      .in("section_id", sectionIds);
    for (const p of prog ?? []) {
      const cid = courseOfSection[p.section_id];
      if (cid) doneLessons[cid] = (doneLessons[cid] ?? 0) + 1;
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

        {masteryCourse && mastery && activeGroup?.key === courseGroup(masteryCourse) && (
          <Link
            href={`/courses/${masteryCourse.slug}`}
            className="group relative mb-8 block rounded-3xl bg-gradient-to-r from-amber-400 via-emerald-300 to-amber-400 p-[1.5px] shadow-[0_0_60px_rgba(251,191,36,0.22)] transition-shadow hover:shadow-[0_0_80px_rgba(251,191,36,0.35)]"
          >
            <div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-ocean-950 px-6 py-8 sm:px-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.16),transparent_55%)]" />
              <div className="relative flex flex-col items-center gap-6 sm:flex-row">
                <MasteryEmblem
                  size={112}
                  muted={!mastery.unlocked && !mastery.passed}
                  className={mastery.unlocked || mastery.passed ? "drop-shadow-[0_0_22px_rgba(251,191,36,0.5)]" : ""}
                />
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-300">
                    {mastery.passed ? "Mastered" : "The final beginner test"}
                  </p>
                  <h2 className="mt-1 font-display text-3xl text-amber-50">{masteryCourse.title}</h2>
                  {masteryCourse.subtitle && <p className="mt-1 text-ocean-300">{masteryCourse.subtitle}</p>}
                  {!mastery.passed && !mastery.unlocked && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-ocean-400">
                        <span>Complete every beginner course to unlock</span>
                        <span className="font-mono">
                          {mastery.requirements.filter((r) => r.done).length}/{mastery.requirements.length}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ocean-900">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-300"
                          style={{
                            width: `${
                              mastery.requirements.length
                                ? (mastery.requirements.filter((r) => r.done).length / mastery.requirements.length) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {mastery.passed ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-ocean-950">
                      <BadgeCheck className="h-4 w-4" /> {masteryCourse.badge_title}
                    </span>
                  ) : mastery.unlocked ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-ocean-950 group-hover:bg-amber-300">
                      Take the exam <ArrowRight className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-ocean-700 px-5 py-2.5 text-sm text-ocean-300">
                      <Lock className="h-4 w-4" /> Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )}

        {courses.length === 0 ? (
          <div className="card-deep rounded-2xl p-10 text-center">
            <GraduationCap className="w-8 h-8 text-ocean-400 mx-auto mb-3" />
            <p className="text-ocean-300">
              The first courses are being prepared. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {courses.map((c) => {
              const isDone = completed.has(c.id);
              const lessons = lessonCount[c.id] ?? 0;
              const done = doneLessons[c.id] ?? 0;
              const inProgress = !isDone && done > 0;
              const locked = !!c.members_only && !membersAccess;
              return (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className={`group flex flex-col overflow-hidden rounded-2xl border bg-ocean-900/40 transition-colors ${
                    c.members_only
                      ? "border-amber-500/30 hover:border-amber-400/60"
                      : isDone
                      ? "border-emerald-500/30 hover:border-emerald-400/60"
                      : "border-ocean-800/60 hover:border-ocean-500"
                  }`}
                >
                  {/* Cover */}
                  <div className="relative">
                    {c.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.cover_image} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-ocean-900 to-ocean-950">
                        <GraduationCap className="h-10 w-10 text-ocean-600" />
                      </div>
                    )}
                    {isDone && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-medium text-white">
                        <BadgeCheck className="h-3.5 w-3.5" /> Completed
                      </span>
                    )}
                    {locked && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-medium text-ocean-950">
                        <Lock className="h-3.5 w-3.5" /> Members only
                      </span>
                    )}
                    {inProgress && lessons > 0 && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-ocean-950/70">
                        <div className="h-full bg-emerald-400" style={{ width: `${(done / lessons) * 100}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <p
                      className={`mb-1 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.18em] ${
                        c.members_only ? "text-amber-300/90" : isDone ? "text-emerald-300/90" : "text-amber-300/80"
                      }`}
                    >
                      <Award className="h-3.5 w-3.5" /> {c.badge_title}
                    </p>
                    <h2 className="font-display text-2xl leading-tight text-white group-hover:text-ocean-100">
                      {c.title}
                    </h2>
                    {c.subtitle && <p className="mt-1 text-sm text-ocean-300">{c.subtitle}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ocean-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> ~{c.est_minutes} min
                      </span>
                      {lessons > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <ScrollText className="h-3.5 w-3.5" /> {lessons} lessons
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-5">
                      {isDone ? (
                        <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
                          <BadgeCheck className="h-4 w-4" /> Review course
                        </span>
                      ) : locked ? (
                        <span className="inline-flex items-center gap-2 text-sm text-amber-300">
                          <Lock className="h-4 w-4" /> Join the Society to take this class
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-emerald-500">
                          {inProgress ? `Continue · ${done}/${lessons}` : "Start course, free"}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
