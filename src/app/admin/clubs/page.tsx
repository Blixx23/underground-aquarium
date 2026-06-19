import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminClubsList from "./AdminClubsList";

export const dynamic = "force-dynamic";

type QueueClub = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  dues_amount_cents: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  public_url: string | null;
  meeting_info: string | null;
  nonprofit_info: string | null;
  owner_name: string | null;
  owner_username: string | null;
  owner_email: string | null;
};

export default async function AdminClubsPage() {
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

  // Clubs requesting a public listing but not yet approved.
  const { data: clubs } = await supabaseAdmin
    .from("clubs")
    .select(
      "id, name, slug, description, city, state, logo_url, dues_amount_cents, contact_name, contact_email, contact_phone, public_url, meeting_info, nonprofit_info"
    )
    .eq("is_public", true)
    .eq("approved", false)
    .order("name", { ascending: true });

  const list = clubs ?? [];

  // Look up each club's owner for context.
  const ownerByClub: Record<
    string,
    { name: string | null; email: string | null; user_id: string | null }
  > = {};
  if (list.length > 0) {
    const { data: owners } = await supabaseAdmin
      .from("club_members")
      .select("club_id, user_id, display_name, email")
      .in(
        "club_id",
        list.map((c) => c.id)
      )
      .eq("role", "owner");
    for (const o of owners ?? []) {
      ownerByClub[o.club_id as string] = {
        name: (o.display_name as string | null) ?? null,
        email: (o.email as string | null) ?? null,
        user_id: (o.user_id as string | null) ?? null,
      };
    }
  }

  // Resolve owner usernames from profiles.
  const usernameById: Record<string, string | null> = {};
  const ownerIds = Object.values(ownerByClub)
    .map((o) => o.user_id)
    .filter((x): x is string => Boolean(x));
  if (ownerIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .in("id", ownerIds);
    for (const p of profs ?? []) {
      usernameById[p.id as string] = (p.username as string | null) ?? null;
    }
  }

  const queue: QueueClub[] = list.map((c) => {
    const owner = ownerByClub[c.id];
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      city: c.city ?? null,
      state: c.state ?? null,
      logo_url: c.logo_url ?? null,
      dues_amount_cents: c.dues_amount_cents ?? null,
      contact_name: c.contact_name ?? null,
      contact_email: c.contact_email ?? null,
      contact_phone: c.contact_phone ?? null,
      public_url: c.public_url ?? null,
      meeting_info: c.meeting_info ?? null,
      nonprofit_info: c.nonprofit_info ?? null,
      owner_name: owner?.name ?? null,
      owner_username: owner?.user_id
        ? usernameById[owner.user_id] ?? null
        : null,
      owner_email: owner?.email ?? null,
    };
  });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-1">Club review</h1>
        <p className="text-ocean-400 mb-8">
          Clubs waiting to be approved for the public directory.
        </p>
        <AdminClubsList initialClubs={queue} />
      </div>
    </main>
  );
}
