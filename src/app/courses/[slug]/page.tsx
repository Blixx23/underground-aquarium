import { notFound, redirect } from "next/navigation";
import { isMasterySlug } from "@/lib/courses/mastery";
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
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import { shareMeta, shareCardUrl } from "@/lib/seo/share";
import { breadcrumbJsonLd, ldJson, SITE } from "@/lib/marketplace/seo";
import ShareButton from "@/app/events/ShareButton";
import { canTakeMembersCourses, courseAccessInfo } from "@/lib/courses/access";
import { SOCIETY_PATH } from "@/lib/config";

export const dynamic = "force-dynamic";

type CourseMetaRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  est_minutes: number | null;
  cover_image?: string | null;
  members_only?: boolean | null;
};

/** The course plus what search and share cards need. Tolerates older columns. */
async function loadCourseMeta(slug: string): Promise<{ course: CourseMetaRow; lessons: number } | null> {
  const base = "id, title, subtitle, description, est_minutes";
  let course: CourseMetaRow | null = null;
  for (const cols of [`${base}, cover_image, members_only`, `${base}, cover_image`, base]) {
    const { data, error } = await supabasePublic
      .from("courses")
      .select(cols)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!error) {
      course = (data as unknown as CourseMetaRow | null) ?? null;
      break;
    }
  }
  if (!course) return null;
  const { count } = await supabasePublic
    .from("course_sections")
    .select("id", { count: "exact", head: true })
    .eq("course_id", course.id);
  return { course, lessons: count ?? 0 };
}

const clip = (s: string, n = 158) => (s.length > n ? `${s.slice(0, n - 3).trimEnd()}...` : s);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadCourseMeta(slug);
  if (!found) return { title: "Course" };
  const { course, lessons } = found;
  const society = Boolean(course.members_only);

  // "Nitrogen Cycle: Free Aquarium Course" matches how people search for a
  // topic plus "course"; the layout adds "| Underground Aquarium".
  const title = society ? `${course.title}: Society Aquarium Class` : `${course.title}: Free Aquarium Course`;
  const facts = [
    lessons ? `${lessons} lessons` : null,
    course.est_minutes ? `about ${course.est_minutes} minutes` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const lead = (course.description ?? course.subtitle ?? "").replace(/\s+/g, " ").trim();
  const tail = society
    ? `A Society class${facts ? `: ${facts}` : ""}, with a certificate and profile badge.`
    : `Free online course${facts ? `: ${facts}` : ""}. Pass the quizzes to earn a certificate and profile badge.`;
  const description = clip(lead ? `${lead} ${tail}` : tail);

  return {
    title,
    description,
    alternates: { canonical: `/courses/${slug}` },
    ...shareMeta({
      path: `/courses/${slug}`,
      // The course's own cover when it has one, else our card with its facts.
      image: course.cover_image || null,
      alt: `${course.title}, ${society ? "a Society class" : "a free aquarium course"} on Underground Aquarium`,
    }),
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
  if (isMasterySlug(course.slug)) redirect(`/courses/${course.slug}/learn`);

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

  // Society classes: show the overview to everyone, but only members can start.
  const access = await courseAccessInfo(course.id);
  const membersLocked = access.members_only && !(await canTakeMembersCourses());

  const completedCount = completedIds.size;
  const inProgress = completedCount > 0 && !courseDone;
  const learnHref = membersLocked ? SOCIETY_PATH : `/courses/${course.slug}/learn`;
  const certHref = `/courses/${course.slug}/certificate`;

  const cta = membersLocked ? (
    <>Join the Society to take this class</>
  ) : courseDone ? (
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

  // Lets Google show this as a course in search (Course info and course
  // lists), with the provider, cost, workload and what it covers.
  const meta = await loadCourseMeta(slug);
  const pageUrl = `${SITE}/courses/${course.slug}`;
  const cover = meta?.course.cover_image || null;
  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${pageUrl}#course`,
    name: course.title,
    description: course.description ?? course.subtitle ?? course.title,
    url: pageUrl,
    image: cover ? (cover.startsWith("http") ? cover : `${SITE}${cover}`) : `${SITE}${shareCardUrl(`/courses/${course.slug}`)}`,
    inLanguage: "en",
    isAccessibleForFree: !access.members_only,
    educationalLevel: access.members_only ? "Society" : access.level.charAt(0).toUpperCase() + access.level.slice(1),
    educationalCredentialAwarded: "Certificate of Completion",
    numberOfLessons: sections.length || undefined,
    provider: {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Underground Aquarium",
      sameAs: `${SITE}/`,
    },
    offers: access.members_only
      ? { "@type": "Offer", category: "Subscription", url: `${SITE}${SOCIETY_PATH}` }
      : { "@type": "Offer", category: "Free", price: 0, priceCurrency: "USD", availability: "https://schema.org/InStock", url: pageUrl },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      ...(course.est_minutes ? { courseWorkload: `PT${course.est_minutes}M` } : {}),
    },
    ...(sections.length
      ? {
          syllabusSections: sections.map((s) => ({ "@type": "Syllabus", name: s.title })),
        }
      : {}),
  };
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Courses", path: "/courses" },
    { name: course.title, path: `/courses/${course.slug}` },
  ]);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson([courseLd, crumbs]) }} />
      <div className="max-w-3xl mx-auto">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Courses
        </Link>

        {/* Hero */}
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-ocean-400 mb-3">
          Underground Aquarium · {access.members_only ? "Society class" : "Free course"}
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
          <ShareButton url={pageUrl} title={`${course.title}, ${access.members_only ? "a Society class" : "a free aquarium course"} on Underground Aquarium`} />
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
