import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminTankReportsList, { type QueueTankReport } from "./AdminTankReportsList";

export const metadata: Metadata = { title: "Admin · Tank reports" };

export const dynamic = "force-dynamic";

export default async function AdminTankReportsPage() {
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

  // Reports from the "Report this tank" button that nobody has closed yet.
  // The status column arrives with step 58; until it's run, say so plainly
  // instead of showing an empty list that looks like "all caught up".
  const { data: rows, error } = await supabaseAdmin
    .from("tank_reports")
    .select("id, tank_id, reason, reporter_id, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const setupNeeded = Boolean(error);
  const list = rows ?? [];

  // The tanks themselves, so each report shows what was flagged.
  const tankIds = Array.from(
    new Set(list.map((r) => r.tank_id as string | null).filter((x): x is string => Boolean(x)))
  );
  const tankById: Record<string, { name: string; user_id: string | null; is_public: boolean; image: string | null }> = {};
  if (tankIds.length > 0) {
    const { data: tanks } = await supabaseAdmin
      .from("tanks")
      .select("id, name, user_id, is_public, images")
      .in("id", tankIds);
    for (const t of tanks ?? []) {
      const images = Array.isArray(t.images) ? (t.images as string[]) : [];
      tankById[t.id as string] = {
        name: (t.name as string) || "Untitled tank",
        user_id: (t.user_id as string | null) ?? null,
        is_public: t.is_public === true,
        image: images[0] ?? null,
      };
    }
  }

  // Names for both the people reporting and the tank owners.
  const peopleIds = Array.from(
    new Set(
      [
        ...list.map((r) => r.reporter_id as string | null),
        ...Object.values(tankById).map((t) => t.user_id),
      ].filter((x): x is string => Boolean(x))
    )
  );
  const usernameById: Record<string, string | null> = {};
  const nameById: Record<string, string | null> = {};
  if (peopleIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", peopleIds);
    for (const p of profs ?? []) {
      usernameById[p.id as string] = (p.username as string | null) ?? null;
      nameById[p.id as string] = (p.full_name as string | null) ?? null;
    }
  }

  const queue: QueueTankReport[] = list.map((r) => {
    const rid = (r.reporter_id as string | null) ?? null;
    const tid = (r.tank_id as string | null) ?? null;
    const tank = tid ? tankById[tid] : undefined;
    const oid = tank?.user_id ?? null;
    return {
      id: r.id as string,
      tank_id: tid,
      tank_name: tank?.name ?? null,
      tank_image: tank?.image ?? null,
      tank_is_public: tank?.is_public ?? false,
      tank_missing: !tank,
      owner_username: oid ? usernameById[oid] ?? null : null,
      owner_name: oid ? nameById[oid] ?? null : null,
      reason: (r.reason as string | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
      reporter_username: rid ? usernameById[rid] ?? null : null,
      reporter_name: rid ? nameById[rid] ?? null : null,
    };
  });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">Tank reports</h1>
        <p className="text-ocean-400 mb-8">
          Community tanks members flagged with &quot;Report this tank&quot;.
          Open the tank to look, then make it private if it shouldn&apos;t be
          public, mark the report resolved if you&apos;ve handled it another
          way, or dismiss it if there&apos;s nothing wrong.
        </p>
        {setupNeeded ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
            This screen needs a small database update first. Run
            step58_fixes.sql in the Supabase SQL Editor, then reload
            this page.
          </div>
        ) : (
          <AdminTankReportsList initialReports={queue} />
        )}
      </div>
    </main>
  );
}
