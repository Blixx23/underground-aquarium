import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ClipboardCheck,
  ArrowRight,
  GraduationCap,
  Fish,
  Flag,
  Droplets,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminTool = {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  pending?: number;
};

export default async function AdminHubPage() {
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

  // Clubs awaiting review — platform admin reads via the service-role client,
  // since normal club RLS doesn't expose other people's unapproved clubs.
  const { count: clubCount } = await supabaseAdmin
    .from("clubs")
    .select("id", { count: "exact", head: true })
    .eq("is_public", true)
    .eq("approved", false);
  const pendingClubs = clubCount ?? 0;

  // Draft (unpublished) courses still need finishing/publishing.
  const { count: draftCourseCount } = await supabaseAdmin
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("is_published", false);
  const draftCourses = draftCourseCount ?? 0;

  // Species suggestions from the community still waiting on a decision.
  const { count: speciesCount } = await supabaseAdmin
    .from("species_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const pendingSpecies = speciesCount ?? 0;

  // User reports that haven't been actioned yet.
  const { count: reportCount } = await supabaseAdmin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  const openReports = reportCount ?? 0;

  // Each tool reports its own count of items awaiting a response, so the hub
  // doubles as a quick status board. Add future tools here and they pick up
  // the same pending indicator automatically.
  const tools: AdminTool[] = [
    {
      href: "/admin/clubs",
      label: "Club review",
      description: "Approve or reject clubs awaiting review",
      Icon: ClipboardCheck,
      pending: pendingClubs,
    },
    {
      href: "/admin/courses",
      label: "Courses",
      description: "Create and edit courses, lessons, and quizzes",
      Icon: GraduationCap,
      pending: draftCourses,
    },
    {
      href: "/admin/species",
      label: "Species suggestions",
      description: "Review fish and animals the community has suggested",
      Icon: Fish,
      pending: pendingSpecies,
    },
    {
      href: "/admin/reports",
      label: "Reports",
      description: "Review content and users flagged by members",
      Icon: Flag,
      pending: openReports,
    },
    {
      href: "/admin/bubbles",
      label: "Bubbles",
      description: "Award or deduct member bubbles",
      Icon: Droplets,
    },
  ];

  const totalPending = tools.reduce((sum, t) => sum + (t.pending ?? 0), 0);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-7 h-7 text-amber-300" />
          <h1 className="font-display text-3xl text-white leading-tight">
            Admin hub
          </h1>
        </div>
        <p className="text-ocean-300 mb-8">
          Platform tools for running Underground Aquarium.
          {totalPending > 0
            ? ` ${totalPending} item${totalPending === 1 ? "" : "s"} waiting on you.`
            : " Everything's caught up."}
        </p>

        <div className="space-y-4">
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex items-center justify-between gap-4 rounded-2xl border border-ocean-700/60 bg-ocean-800/40 px-6 py-5 hover:bg-ocean-800/60 transition-colors group"
            >
              <span className="flex items-center gap-3">
                <t.Icon className="w-6 h-6 text-ocean-200" />
                <span>
                  <span className="block text-white font-medium">{t.label}</span>
                  <span className="block text-sm text-ocean-400">
                    {t.description}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-3">
                {t.pending === undefined ? null : t.pending > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                    {t.pending} pending
                  </span>
                ) : (
                  <span className="text-xs text-ocean-500">All clear</span>
                )}
                <ArrowRight className="w-5 h-5 text-ocean-400 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-sm text-ocean-600 mt-6">
          More tools will appear here as the platform grows.
        </p>
      </div>
    </main>
  );
}
