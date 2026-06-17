import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import EventsList, { type EventCard } from "./EventsList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Aquarium club meetups, frag swaps, auctions, and shop events. Find something near you or post your own.",
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  starts_at: string;
  is_online: boolean;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
  host_kind: string;
  host_store_id: string | null;
  lat: number | null;
  lng: number | null;
};

export default async function EventsPage() {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const { data } = await supabasePublic
    .from("events")
    .select(
      "id, slug, title, description, cover_image, starts_at, is_online, venue_name, city, state, timezone, host_kind, host_store_id, lat, lng"
    )
    .eq("status", "published")
    .gte("starts_at", cutoff)
    .order("starts_at", { ascending: true });

  const events = (data ?? []) as EventRow[];

  // Resolve store host names
  const storeIds = [
    ...new Set(
      events.filter((e) => e.host_store_id).map((e) => e.host_store_id!)
    ),
  ];
  let storeNameById = new Map<string, string>();
  if (storeIds.length > 0) {
    const { data: ss } = await supabasePublic
      .from("fish_stores")
      .select("id, name")
      .in("id", storeIds);
    storeNameById = new Map(
      ((ss as { id: string; name: string }[]) ?? []).map((s) => [s.id, s.name])
    );
  }

  const cards: EventCard[] = events.map((ev) => ({
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    description: ev.description,
    cover_image: ev.cover_image,
    starts_at: ev.starts_at,
    is_online: ev.is_online,
    venue_name: ev.venue_name,
    city: ev.city,
    state: ev.state,
    timezone: ev.timezone,
    host_kind: ev.host_kind,
    hostLabel:
      ev.host_kind === "store" && ev.host_store_id
        ? storeNameById.get(ev.host_store_id) || "Local shop"
        : "Community event",
    lat: ev.lat,
    lng: ev.lng,
  }));

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
              Events
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
              Aquarium events
            </h1>
            <p className="text-ocean-300">
              Club meetups, frag swaps, auctions, and shop happenings. Find one
              near you — or post your own.
            </p>
          </div>
          <Link
            href="/events/submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Submit an event
          </Link>
        </div>

        <EventsList events={cards} />
      </div>
    </main>
  );
}