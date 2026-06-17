import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, MapPin, Globe, Plus, Store, Users } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

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
};

function formatWhen(iso: string, tz: string | null) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || "America/Los_Angeles",
    });
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

export default async function EventsPage() {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const { data } = await supabasePublic
    .from("events")
    .select(
      "id, slug, title, description, cover_image, starts_at, is_online, venue_name, city, state, timezone, host_kind, host_store_id"
    )
    .eq("status", "published")
    .gte("starts_at", cutoff)
    .order("starts_at", { ascending: true });

  const events = (data ?? []) as EventRow[];

  // Resolve store host names
  const storeIds = [
    ...new Set(events.filter((e) => e.host_store_id).map((e) => e.host_store_id!)),
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

        {events.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <Calendar className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No upcoming events yet</p>
            <p className="text-ocean-400 text-sm">
              Be the first to put one on the map.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => {
              const hostLabel =
                ev.host_kind === "store" && ev.host_store_id
                  ? storeNameById.get(ev.host_store_id) || "Local shop"
                  : "Community event";
              const place = ev.is_online
                ? "Online"
                : [ev.venue_name, ev.city, ev.state]
                    .filter(Boolean)
                    .join(", ") || "Location TBA";
              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.slug}`}
                  className="block rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
                >
                  {ev.cover_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ev.cover_image}
                      alt=""
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-5">
                    <p className="text-emerald-400 text-sm font-medium flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatWhen(ev.starts_at, ev.timezone)}
                    </p>
                    <h3 className="text-white font-medium text-lg mt-1.5">
                      {ev.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ocean-400">
                      <span className="flex items-center gap-1.5">
                        {ev.host_kind === "store" ? (
                          <Store className="w-3.5 h-3.5" />
                        ) : (
                          <Users className="w-3.5 h-3.5" />
                        )}
                        {hostLabel}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {ev.is_online ? (
                          <Globe className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                        {place}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-ocean-300 text-sm mt-3 line-clamp-2">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}