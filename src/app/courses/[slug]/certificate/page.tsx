import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Award, ArrowLeft } from "lucide-react";
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
    .select("certificate_code, completed_at")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .maybeSingle();

  // Haven't earned it yet — send them to take the course.
  if (!completion) redirect(`/courses/${slug}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.full_name ||
    profile?.display_name ||
    profile?.username ||
    (user.user_metadata?.username as string | undefined) ||
    user.email?.split("@")[0] ||
    "Aquarist";

  const issued = new Date(completion.completed_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/courses/${slug}`}
          className="no-print inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to course
        </Link>

        {/* Certificate */}
        <div className="cert-paper relative rounded-2xl border border-amber-300/30 bg-gradient-to-b from-ocean-900 to-ocean-950 p-1 shadow-2xl shadow-ocean-950/60">
          <div className="relative overflow-hidden rounded-xl border border-ocean-700/40 px-8 py-12 sm:px-14 sm:py-16 text-center">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-300/5 blur-3xl" />

            <p className="relative text-[11px] font-mono uppercase tracking-[0.35em] text-ocean-400 mb-8">
              Underground Aquarium Society
            </p>

            {/* Seal */}
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-amber-400/10 animate-glow-pulse" />
              <div className="absolute inset-0 rounded-full border border-amber-300/40" />
              <div className="absolute inset-2 rounded-full border border-amber-300/20" />
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <Award className="h-8 w-8 text-amber-200" />
              </div>
            </div>

            <p className="relative font-display text-2xl sm:text-3xl text-white glow-text mb-2">
              Certificate of Completion
            </p>
            <p className="relative text-ocean-400 text-sm mb-8">
              This certifies that
            </p>

            <p className="relative font-display text-3xl sm:text-4xl text-amber-100 mb-8 break-words">
              {name}
            </p>

            <p className="relative text-ocean-300 mb-2">has successfully completed</p>
            <p className="relative font-display text-xl sm:text-2xl text-white mb-1">
              {course.title}
            </p>
            <p className="relative text-xs font-mono uppercase tracking-[0.2em] text-amber-200/80 mb-10">
              {course.badge_title}
            </p>

            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 border-t border-ocean-800/60 pt-6 text-sm">
              <div>
                <p className="text-ocean-500 text-xs uppercase tracking-wider mb-1">
                  Issued
                </p>
                <p className="text-ocean-200">{issued}</p>
              </div>
              <div>
                <p className="text-ocean-500 text-xs uppercase tracking-wider mb-1">
                  Credential ID
                </p>
                <p className="text-ocean-200 font-mono">
                  {completion.certificate_code}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="no-print mt-8">
          <CertificateActions />
        </div>
      </div>

      <style>{`@media print { header, footer, .no-print { display: none !important; } }`}</style>
    </main>
  );
}
