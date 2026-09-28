import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminPendingShopsList, { type QueueShop } from "./AdminPendingShopsList";

export const metadata: Metadata = { title: "Admin · New shops" };

export const dynamic = "force-dynamic";

export default async function AdminPendingShopsPage() {
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

  // "Suggest a store" saves straight into fish_stores as "pending". Nothing
  // shows publicly until an admin publishes it here.
  const { data: rows } = await supabaseAdmin
    .from("fish_stores")
    .select("id, slug, name, address, city, state, website, description, tags, submitted_by, updated_at")
    .eq("status", "pending")
    .order("updated_at", { ascending: true });

  const list = rows ?? [];

  const usernameById: Record<string, string | null> = {};
  const nameById: Record<string, string | null> = {};
  const suggesterIds = Array.from(
    new Set(
      list
        .map((r) => r.submitted_by as string | null)
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

  const queue: QueueShop[] = list.map((r) => {
    const sid = (r.submitted_by as string | null) ?? null;
    return {
      id: r.id as string,
      name: (r.name as string) || "Unnamed shop",
      address: (r.address as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      state: (r.state as string | null) ?? null,
      website: (r.website as string | null) ?? null,
      description: (r.description as string | null) ?? null,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      sent_at: (r.updated_at as string | null) ?? null,
      suggester_username: sid ? usernameById[sid] ?? null : null,
      suggester_name: sid ? nameById[sid] ?? null : null,
    };
  });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">New shops</h1>
        <p className="text-ocean-400 mb-8">
          Shops members suggested through &quot;Suggest a store&quot;. Fix the
          name or address if needed, then publish it to the Shops directory
          and map, or reject it if it isn&apos;t a real fish store. Rejected
          shops are hidden, not deleted, so they show under Hidden on the All
          shops screen.
        </p>
        <AdminPendingShopsList initialShops={queue} />
      </div>
    </main>
  );
}
