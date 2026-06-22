import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminFeedbackList from "./AdminFeedbackList";

export const dynamic = "force-dynamic";

type QueueFeedback = {
  id: string;
  kind: string;
  message: string;
  page_url: string | null;
  status: string;
  created_at: string | null;
  submitter_username: string | null;
  submitter_name: string | null;
};

export default async function AdminFeedbackPage() {
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

  // Active work (new + in progress) plus recently-finished items for
  // reference and duplicate-checking. Done history is capped to stay light.
  const cols = "id, user_id, kind, message, page_url, status, created_at";
  const [{ data: activeRows }, { data: doneRows }] = await Promise.all([
    supabaseAdmin
      .from("feedback")
      .select(cols)
      .in("status", ["new", "in_progress"])
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("feedback")
      .select(cols)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const list = [...(activeRows ?? []), ...(doneRows ?? [])];

  // Resolve who sent each one (anonymous feedback has no user_id).
  const usernameById: Record<string, string | null> = {};
  const nameById: Record<string, string | null> = {};
  const submitterIds = Array.from(
    new Set(
      list
        .map((r) => r.user_id as string | null)
        .filter((x): x is string => Boolean(x))
    )
  );
  if (submitterIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", submitterIds);
    for (const p of profs ?? []) {
      usernameById[p.id as string] = (p.username as string | null) ?? null;
      nameById[p.id as string] = (p.full_name as string | null) ?? null;
    }
  }

  const queue: QueueFeedback[] = list.map((r) => {
    const sid = r.user_id as string | null;
    return {
      id: r.id as string,
      kind: (r.kind as string | null) ?? "bug",
      message: (r.message as string | null) ?? "",
      page_url: (r.page_url as string | null) ?? null,
      status: (r.status as string | null) ?? "new",
      created_at: (r.created_at as string | null) ?? null,
      submitter_username: sid ? usernameById[sid] ?? null : null,
      submitter_name: sid ? nameById[sid] ?? null : null,
    };
  });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">
          Feedback &amp; bugs
        </h1>
        <p className="text-ocean-400 mb-8">
          Bug reports and ideas testers have sent in. Start one when you pick it
          up, mark it done when it&apos;s handled, and search across all of them
          to check whether something has come up before.
        </p>
        <AdminFeedbackList initialFeedback={queue} />
      </div>
    </main>
  );
}
