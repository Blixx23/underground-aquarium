import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Globe,
  Store,
  Users,
  Navigation,
} from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import EventRsvp from "../EventRsvp";
import EditEvent from "../EditEvent";
import ShareButton from "../ShareButton";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

function fmtDateTime(iso: string, tz: string | null) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || "America/Los_Angeles",
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function fmtTime(iso: string, tz: string | null) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || "America/Los_Angeles",
    });
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabasePublic
    .from("events")
    .select("title, description, cover_image")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return { title: "Event" };

  const title = data.title as string;
  const description =
    (data.description as string | null) ??
    "An aquarium event on Underground Aquarium.";
  const url = `https://www.undergroundaquarium.com/events/${slug}`;
  const images = data.cover_image ? [data.cover_image as string] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, url, type: "website", images },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}

export default async function EventDetailPage({ params }: Params) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ev } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!ev) notFound();

  // Host + edit permission
  let hostLabel = "Community event";
  let hostHref: string | null = null;
  let backHref = "/events";
  let backLabel = "All events";
  let canEdit = !!user && ev.created_by === user.id;

  if (ev.host_kind === "store" && ev.host_store_id) {
    const { data: store } = await supabase
      .from("fish_stores")
      .select("name, slug, claimed_by")
      .eq("id", ev.host_store_id)
      .maybeSingle();
    if (store) {
      hostLabel = store.name as string;
      hostHref = `/stores/${store.slug}`;
      if (user && store.claimed_by === user.id) canEdit = true;
    }
  } else if (ev.host_kind === "club" && ev.host_club_id) {
    const { data: club } = await supabase
      .from("clubs")
      .select("name, slug")
      .eq("id", ev.host_club_id)
      .maybeSingle();
    if (club) {
      hostLabel = club.name as string;
      hostHref = `/c/${club.slug}`;
      backHref = `/c/${club.slug}/events`;
      backLabel = "Club events";
      if (user) {
        const { data: me } = await supabase
          .from("club_members")
          .select("role, status")
          .eq("club_id", ev.host_club_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (
          me?.status === "active" &&
          (me.role === "owner" || me.role === "admin" || me.role === "officer")
        ) {
          canEdit = true;
        }
      }
    }
  } else {
    const { data: prof } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", ev.created_by)
      .maybeSingle();
    hostLabel =
      (prof?.full_name as string) ||
      (prof?.username as string) ||
      "Community member";
  }

  // RSVPs
  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("user_id, status")
    .eq("event_id", ev.id);
  const rsvpList = (rsvps ?? []) as { user_id: string; status: string }[];
  const goingCount = rsvpList.filter((r) => r.status === "going").length;
  const myStatus = user
    ? (rsvpList.find((r) => r.user_id === user.id)?.status as
        | "going"
        | "interested"
        | undefined) ?? null
    : null;

  const place = [ev.venue_name, ev.address, ev.city, ev.state, ev.postal_code]
    .filter(Boolean)
    .join(", ");
  const directionsUrl = place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        place
      )}`
    : null;
  const shareUrl = `https://www.undergroundaquarium.com/events/${slug}`;

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </Link>
        </div>

        {ev.status !== "published" && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 mb-6 text-amber-200 text-sm">
            This event is pending review and isn&apos;t public yet.
          </div>
        )}

        {canEdit && (
          <EditEvent
            event={{
              id: ev.id as string,
              title: ev.title as string,
              description: (ev.description as string | null) ?? null,
              starts_at: ev.starts_at as string,
              ends_at: (ev.ends_at as string | null) ?? null,
              is_online: ev.is_online as boolean,
              online_url: (ev.online_url as string | null) ?? null,
              venue_name: (ev.venue_name as string | null) ?? null,
              address: (ev.address as string | null) ?? null,
              city: (ev.city as string | null) ?? null,
              state: (ev.state as string | null) ?? null,
              postal_code: (ev.postal_code as string | null) ?? null,
              capacity: (ev.capacity as number | null) ?? null,
              cover_image: (ev.cover_image as string | null) ?? null,
            }}
          />
        )}

        {ev.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ev.cover_image as string}
            alt=""
            className="w-full h-56 object-cover rounded-2xl mb-6"
          />
        )}

        <h1 className="font-display text-3xl sm:text-4xl text-white mb-3">
          {ev.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {hostHref ? (
            <Link
              href={hostHref}
              className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 text-sm"
            >
              <Store className="w-4 h-4" /> {hostLabel}
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 text-ocean-300 text-sm">
              <Users className="w-4 h-4" /> {hostLabel}
            </span>
          )}
          <ShareButton url={shareUrl} title={ev.title as string} />
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <Calendar className="w-4 h-4 text-ocean-400 mt-0.5 shrink-0" />
            <p className="text-ocean-200 text-sm">
              {fmtDateTime(ev.starts_at as string, ev.timezone as string | null)}
              {ev.ends_at
                ? ` – ${fmtTime(
                    ev.ends_at as string,
                    ev.timezone as string | null
                  )}`
                : ""}
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            {ev.is_online ? (
              <>
                <Globe className="w-4 h-4 text-ocean-400 mt-0.5 shrink-0" />
                <p className="text-ocean-200 text-sm">
                  Online event
                  {ev.online_url ? (
                    <>
                      {" — "}
                      <Link
                        href={ev.online_url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-300 hover:text-emerald-200"
                      >
                        join link
                      </Link>
                    </>
                  ) : null}
                </p>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-ocean-400 mt-0.5 shrink-0" />
                <p className="text-ocean-200 text-sm">
                  {place || "Location to be announced"}
                </p>
              </>
            )}
          </div>
        </div>

        {ev.description && (
          <p className="text-ocean-200 leading-relaxed whitespace-pre-wrap mb-8">
            {ev.description}
          </p>
        )}

        {directionsUrl && (
          <Link
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 text-ocean-200 px-4 py-2.5 text-sm hover:border-emerald-500/40 transition-colors mb-8"
          >
            <Navigation className="w-4 h-4" /> Get directions
          </Link>
        )}

        <EventRsvp
          eventId={ev.id as string}
          currentUserId={user?.id ?? null}
          initialStatus={myStatus}
          initialGoingCount={goingCount}
          capacity={(ev.capacity as number | null) ?? null}
        />
      </div>
    </main>
  );
}