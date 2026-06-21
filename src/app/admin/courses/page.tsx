import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminCoursesList, { type AdminCourse } from "./AdminCoursesList";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
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

  const { data: courseRows } = await supabaseAdmin
    .from("courses")
    .select("id, slug, title, badge_title, est_minutes, is_published, sort_order")
    .order("sort_order", { ascending: true });

  const list = (courseRows ?? []) as AdminCourse[];
  const ids = list.map((c) => c.id);

  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: secs } = await supabaseAdmin
      .from("course_sections")
      .select("id, course_id")
      .in("course_id", ids);
    for (const s of secs ?? []) {
      counts[s.course_id] = (counts[s.course_id] ?? 0) + 1;
    }
  }

  const courses = list.map((c) => ({ ...c, lessons: counts[c.id] ?? 0 }));

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Admin hub
        </Link>
        <h1 className="font-display text-3xl text-white mb-2">Courses</h1>
        <p className="text-ocean-300 mb-8">
          Create and edit courses, lessons, and quizzes.
        </p>
        <AdminCoursesList initialCourses={courses} />
      </div>
    </main>
  );
}
