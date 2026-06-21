import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import CourseEditor, {
  type EditorCourse,
  type EditorSection,
} from "../CourseEditor";

export const dynamic = "force-dynamic";

export default async function AdminCourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) notFound();

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select(
      "id, slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order"
    )
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();

  const { data: sectionRows } = await supabaseAdmin
    .from("course_sections")
    .select("id, title, content, has_video, video_url, sort_order")
    .eq("course_id", id)
    .order("sort_order", { ascending: true });
  const secs = (sectionRows ?? []) as EditorSection[];

  const sectionIds = secs.map((s) => s.id);
  const qCounts: Record<string, number> = {};
  if (sectionIds.length) {
    const { data: qs } = await supabaseAdmin
      .from("course_questions")
      .select("id, section_id")
      .in("section_id", sectionIds);
    for (const q of qs ?? []) {
      qCounts[q.section_id] = (qCounts[q.section_id] ?? 0) + 1;
    }
  }
  const sections = secs.map((s) => ({
    ...s,
    questionCount: qCounts[s.id] ?? 0,
  }));

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Courses
        </Link>
        <CourseEditor
          course={course as EditorCourse}
          initialSections={sections}
        />
      </div>
    </main>
  );
}
