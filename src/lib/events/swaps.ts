import { supabasePublic } from "@/lib/supabase/public";
import type { EventCard } from "@/app/events/EventsList";

/** Swaps, auctions and shows: the events people search "fish swap near me" for. Matched by title, like the date tiles. */
export const SWAP_PATTERN = /swap|frag|trade|auction|expo|show|con\b|convention|fest|fair|aquashella/i;

/** Upcoming published events whose title reads like a swap, auction or show, with host names filled in. */
export async function loadUpcomingSwaps(): Promise<EventCard[]> {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data } = await supabasePublic
    .from("events")
    .select(
      "id, slug, title, description, cover_image, starts_at, is_online, venue_name, city, state, timezone, host_kind, host_store_id, host_club_id, lat, lng"
    )
    .eq("status", "published")
    .eq("show_in_directory", true)
    .gte("starts_at", cutoff)
    .order("starts_at", { ascending: true });

  type Row = {
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
    host_club_id: string | null;
    lat: number | null;
    lng: number | null;
  };
  const rows = ((data ?? []) as Row[]).filter((e) => SWAP_PATTERN.test(e.title));

  const storeIds = [...new Set(rows.map((e) => e.host_store_id).filter((x): x is string => !!x))];
  const clubIds = [...new Set(rows.map((e) => e.host_club_id).filter((x): x is string => !!x))];
  const [stores, clubs] = await Promise.all([
    storeIds.length
      ? supabasePublic.from("fish_stores").select("id, name").in("id", storeIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    clubIds.length
      ? supabasePublic.from("clubs").select("id, name").in("id", clubIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const storeName = new Map(((stores.data ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
  const clubName = new Map(((clubs.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));

  return rows.map((ev) => ({
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
        ? storeName.get(ev.host_store_id) || "Local shop"
        : ev.host_kind === "club" && ev.host_club_id
        ? clubName.get(ev.host_club_id) || "Aquarium club"
        : "Community event",
    lat: ev.lat,
    lng: ev.lng,
  }));
}
