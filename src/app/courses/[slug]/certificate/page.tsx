import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CertificateActions from "../../CertificateActions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Certificate — Underground Aquarium",
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
  if (!user) redirect(`/login?redirect=/courses/${slug}/certificate`);

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, badge_title")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!course) notFound();

  const { data: completion } = await supabase
    .from("course_completions")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .maybeSingle();

  // Haven't earned it yet — send them to take the course.
  if (!completion) redirect(`/courses/${slug}`);

  const pdfUrl = `/api/society/certificate?kind=course&course=${course.id}`;

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
          <CertificateActions />
        </div>
      </div>
    </main>
  );
}
