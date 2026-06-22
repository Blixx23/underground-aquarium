import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import BubbleAwardForm from "./BubbleAwardForm";

export const dynamic = "force-dynamic";

type LedgerRow = {
  id: string;
  delta: number;
  reason: string | null;
  created_at: string | null;
  username: string | null;
};

function whenLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminBubblesPage() {
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

  // Recent manual ledger activity, for the audit trail.
  const { data: events } = await supabaseAdmin
    .from("bubble_events")
    .select("id, user_id, delta, reason, created_at")
    .eq("source", "manual")
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = events ?? [];
  const userIds = Array.from(
    new Set(
      rows
        .map((r) => r.user_id as string | null)
        .filter((x): x is string => Boolean(x))
    )
  );
  const usernameById: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    for (const p of profs ?? []) {
      usernameById[p.id as string] = (p.username as string | null) ?? null;
    }
  }

  const ledger: LedgerRow[] = rows.map((r) => ({
    id: r.id as string,
    delta: (r.delta as number) ?? 0,
    reason: (r.reason as string | null) ?? null,
    created_at: (r.created_at as string | null) ?? null,
    username: usernameById[r.user_id as string] ?? null,
  }));

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">Award bubbles</h1>
        <p className="text-ocean-400 mb-8">
          Grant or deduct bubbles for a member. Every change is recorded in the
          ledger with your reason, and their balance updates immediately.
        </p>

        <BubbleAwardForm />

        <h2 className="text-white font-medium mt-10 mb-3">Recent activity</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-ocean-500">No manual awards yet.</p>
        ) : (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 divide-y divide-ocean-800/40">
            {ledger.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ocean-100">
                    {r.username ? (
                      <Link
                        href={`/u/${r.username}`}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        @{r.username}
                      </Link>
                    ) : (
                      "a member"
                    )}
                    {r.reason ? (
                      <span className="text-ocean-400"> · {r.reason}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ocean-600">
                    {whenLabel(r.created_at)}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    r.delta >= 0 ? "text-emerald-300" : "text-coral-300"
                  }`}
                >
                  {r.delta >= 0 ? `+${r.delta}` : r.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
