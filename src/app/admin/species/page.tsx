import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminSpeciesList from "./AdminSpeciesList";

export const dynamic = "force-dynamic";

type QueueSuggestion = {
  id: string;
  common_name: string;
  scientific_name: string | null;
  note: string | null;
  created_at: string | null;
  suggester_username: string | null;
  suggester_name: string | null;
};

export default async function AdminSpeciesPage() {
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

  // Community species suggestions still waiting on a decision.
  const { data: rows } = await supabaseAdmin
    .from("species_suggestions")
    .select("id, suggester_id, common_name, scientific_name, note, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const list = rows ?? [];

  // Resolve who suggested each one, for a little context.
  const usernameById: Record<string, string | null> = {};
  const nameById: Record<string, string | null> = {};
  const suggesterIds = Array.from(
    new Set(
      list
        .map((r) => r.suggester_id as string | null)
        .filter((x): x is string => Boolean(x))
    )
  );
  if (suggesterIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", suggesterIds);
    for (const p of profs ?? []) {
      usernameById[p.id as string] = (p.username as string | null) ?? null;
      nameById[p.id as string] = (p.full_name as string | null) ?? null;
    }
  }

  const queue: QueueSuggestion[] = list.map((r) => {
    const sid = r.suggester_id as string | null;
    return {
      id: r.id as string,
      common_name: r.common_name as string,
      scientific_name: (r.scientific_name as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
      suggester_username: sid ? usernameById[sid] ?? null : null,
      suggester_name: sid ? nameById[sid] ?? null : null,
    };
  });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">
          Species suggestions
        </h1>
        <p className="text-ocean-400 mb-8">
          Fish and animals the community has suggested for the database. Mark
          each one as added once you&apos;ve created its entry, or dismiss the
          rest.{" "}
          <Link
            href="/species"
            target="_blank"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Open the species list
          </Link>{" "}
          to check what already exists.
        </p>
        <AdminSpeciesList initialSuggestions={queue} />
      </div>
    </main>
  );
}
