import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminEventsList, { type QueueEvent } from "./AdminEventsList";

export const metadata: Metadata = { title: "Admin · Events" };

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
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

  // Community events wait as "pending" until an admin approves them. Shop
  // and club events publish on their own, so they never land here. "*" so
  // an optional column that hasn't been added yet can't break the list.
  const { data: rows } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("status", "pending")
    .order("starts_at", { ascending: true });

  const list = (rows ?? []) as Record<string, unknown>[];

  // Who sent each one in, so the admin knows who will get the notice.
  const usernameById: Record<string, string | null> = {};
  const nameById: Record<string, string | null> = {};
  const submitterIds = Array.from(
    new Set(
      list
        .map((r) => r.created_by as string | null)
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

  // A member can only post as a shop they manage, and those publish right
  // away, but look the shop name up anyway in case one ever lands here.
  const storeNameById: Record<string, string> = {};
  const storeIds = Array.from(
    new Set(
      list
        .map((r) => r.host_store_id as string | null)
        .filter((x): x is string => Boolean(x))
    )
  );
  if (storeIds.length > 0) {
    const { data: stores } = await supabaseAdmin
      .from("fish_stores")
      .select("id, name")
      .in("id", storeIds);
    for (const s of stores ?? []) storeNameById[s.id as string] = s.name as string;
  }

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

  const queue: QueueEvent[] = list.map((r) => {
    const sid = str(r.created_by);
    const storeId = str(r.host_store_id);
    return {
      id: r.id as string,
      slug: r.slug as string,
      title: (r.title as string) || "Untitled event",
      description: str(r.description),
      cover_image: str(r.cover_image),
      starts_at: r.starts_at as string,
      ends_at: str(r.ends_at),
      timezone: str(r.timezone),
      is_online: r.is_online === true,
      online_url: str(r.online_url),
      venue_name: str(r.venue_name),
      address: str(r.address),
      city: str(r.city),
      state: str(r.state),
      postal_code: str(r.postal_code),
      capacity: typeof r.capacity === "number" ? r.capacity : null,
      created_at: str(r.created_at),
      host_label:
        r.host_kind === "store" && storeId
          ? storeNameById[storeId] ?? "Local shop"
          : "Community event",
      submitter_username: sid ? usernameById[sid] ?? null : null,
      submitter_name: sid ? nameById[sid] ?? null : null,
    };
  });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">Events</h1>
        <p className="text-ocean-400 mb-8">
          Community events members sent in. Approve one to put it on the
          events page, or decline it if it doesn&apos;t belong. The member who
          sent it gets a notice either way.
        </p>
        <AdminEventsList initialEvents={queue} />
      </div>
    </main>
  );
}
