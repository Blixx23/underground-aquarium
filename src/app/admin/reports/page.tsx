import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminReportsList from "./AdminReportsList";

export const dynamic = "force-dynamic";

type QueueReport = {
  id: string;
  target_type: string | null;
  target_label: string | null;
  target_url: string | null;
  reason: string | null;
  details: string | null;
  created_at: string | null;
  reporter_username: string | null;
  reporter_name: string | null;
};

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.is_admin) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <ShieldAlert className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white mb-2">Admins only</h1>
          <p className="text-ocean-400">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </main>
    );
  }

  // Member reports still waiting on a decision.
  const { data: rows } = await supabaseAdmin
    .from("reports")
    .select(
      "id, reporter_id, target_type, target_label, target_url, reason, details, created_at"
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const list = rows ?? [];

  // Resolve who filed each one, for a little context.
  const usernameById: Record<string, string | null> = {};
  const nameById: Record<string, string | null> = {};
  const reporterIds = Array.from(
    new Set(
      list
        .map((r) => r.reporter_id as string | null)
        .filter((x): x is string => Boolean(x))
    )
  );
  if (reporterIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", reporterIds);
    for (const p of profs ?? []) {
      usernameById[p.id as string] = (p.username as string | null) ?? null;
      nameById[p.id as string] = (p.full_name as string | null) ?? null;
    }
  }

  const queue: QueueReport[] = list.map((r) => {
    const rid = r.reporter_id as string | null;
    return {
      id: r.id as string,
      target_type: (r.target_type as string | null) ?? null,
      target_label: (r.target_label as string | null) ?? null,
      target_url: (r.target_url as string | null) ?? null,
      reason: (r.reason as string | null) ?? null,
      details: (r.details as string | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
      reporter_username: rid ? usernameById[rid] ?? null : null,
      reporter_name: rid ? nameById[rid] ?? null : null,
    };
  });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">Reports</h1>
        <p className="text-ocean-400 mb-8">
          Members flag listings, profiles, and other content here. Open the
          link to review it, then resolve the report once you&apos;ve acted, or
          dismiss it if there&apos;s nothing to do.
        </p>
        <AdminReportsList initialReports={queue} />
      </div>
    </main>
  );
}
