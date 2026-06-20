import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ClubEvents, { type ClubEvent } from "../ClubEvents";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function ClubEventsPage({ params }: Params) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let status: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("club_members")
      .select("role, status")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();
    role = me?.role ?? null;
    status = me?.status ?? null;
  }
  const isOfficer =
    status === "active" &&
    (role === "owner" || role === "admin" || role === "officer");

  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: upcomingData } = await supabase
    .from("events")
    .select(
      "id, slug, title, description, starts_at, venue_name, city, state, show_in_directory, event_type, cover_image"
    )
    .eq("host_club_id", club.id)
    .eq("status", "published")
    .gte("starts_at", cutoff)
    .order("starts_at", { ascending: true });
  const upcoming = (upcomingData ?? []) as ClubEvent[];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/c/${slug}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {club.name}
        </Link>
        <div className="mb-8 flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-ocean-300" />
          <h1 className="font-display text-3xl leading-tight text-white">
            {club.name} — Events
          </h1>
        </div>

        <ClubEvents
          clubId={club.id}
          isOfficer={isOfficer}
          userId={user?.id ?? null}
          initialEvents={upcoming}
        />
      </div>
    </main>
  );
}
