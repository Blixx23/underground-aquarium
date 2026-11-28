import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CertificateActions from "../../CertificateActions";
import CertificateNameConfirm from "../../CertificateNameConfirm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Certificate",
  robots: { index: false },
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/courses/${slug}/certificate`)}`);

  // Not limited to published courses: a certificate someone already earned
  // stays theirs even if the course is taken down later.
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, badge_title, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) notFound();

  const { data: completion } = await supabase
    .from("course_completions")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .maybeSingle();

  // Haven't earned it yet: send them to take the course.
  if (!completion) redirect(course.is_published ? `/courses/${slug}` : "/courses");

  const pdfUrl = `/api/society/certificate?kind=course&course=${course.id}`;

  // The certificate itself, found by course (not title, so renaming a course
  // never loses it). It doesn't exist until the member confirms their name.
  const { data: issued } = await supabase
    .from("society_certificates")
    .select("code, status")
    .eq("user_id", user.id)
    .eq("kind", "course")
    .eq("course_id", course.id)
    .limit(1)
    .maybeSingle();
  const cert = issued as { code: string; status: string } | null;
  const certCode = cert?.status === "valid" ? cert.code : null;

  if (!cert) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    return (
      <main className="min-h-screen px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/courses/${slug}`}
            className="mb-6 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to course
          </Link>
          <CertificateNameConfirm
            courseId={course.id}
            courseTitle={course.title}
            suggestedName={(profile?.full_name as string | null)?.trim() ?? ""}
          />
        </div>
      </main>
    );
  }

  if (cert.status !== "valid") {
    return (
      <main className="min-h-screen px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-display text-2xl text-white">This certificate isn&apos;t available</h1>
          <p className="mt-3 text-ocean-300">
            It was revoked. If you think that&apos;s a mistake, email support@undergroundaquarium.com.
          </p>
        </div>
      </main>
    );
  }
  const shareUrl = certCode ? `https://www.undergroundaquarium.com/verify/${certCode}` : null;

  return (
    <main className="min-h-screen px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/courses/${slug}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-ocean-500">Certificate of Completion</p>
            <h1 className="font-display text-2xl text-white sm:text-3xl">{course.title}</h1>
          </div>
          <a
            href={pdfUrl}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-amber-300"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </div>

        {/* The real certificate, the same file you download and print. */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#faf7ef] shadow-2xl shadow-black/50">
          <iframe
            src={`${pdfUrl}&inline=1#toolbar=0&navpanes=0&view=FitH`}
            title={`${course.title} certificate`}
            className="block aspect-[11/8.5] w-full"
          />
        </div>
        <p className="mt-3 text-center text-xs text-ocean-500">
          Can&apos;t see it?{" "}
          <a href={pdfUrl} className="text-ocean-300 underline">
            Download the PDF
          </a>
          . Every certificate has a registry number anyone can check at{" "}
          <Link href="/verify" className="text-ocean-300 underline">
            /verify
          </Link>
          .
        </p>

        <div className="mt-8">
          <CertificateActions shareUrl={shareUrl} shareTitle={`I earned the ${course.title} certificate on Underground Aquarium`} />
        </div>
      </div>
    </main>
  );
}
