"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Globe,
  Lock,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import EventCoverUpload from "@/app/events/EventCoverUpload";

export type ClubEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  show_in_directory: boolean | null;
  event_type: string | null;
  cover_image: string | null;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const inputClass =
  "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors";

export default function ClubEvents({
  clubId,
  isOfficer,
  userId,
  initialEvents,
}: {
  clubId: string;
  isOfficer: boolean;
  userId: string | null;
  initialEvents: ClubEvent[];
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [events, setEvents] = useState<ClubEvent[]>(initialEvents);
  const [mode, setMode] = useState<null | "new" | string>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [kind, setKind] = useState<"meeting" | "event">("meeting");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [listPublic, setListPublic] = useState(true);

  function openNew() {
    setError(null);
    setKind("meeting");
    setTitle("");
    setStartsAt("");
    setVenue("");
    setCity("");
    setStateVal("");
    setDescription("");
    setCoverImage(null);
    setListPublic(true);
    setMode("new");
  }

  function openEdit(e: ClubEvent) {
    setError(null);
    setKind(e.event_type === "event" ? "event" : "meeting");
    setTitle(e.title);
    setStartsAt(toLocalInput(e.starts_at));
    setVenue(e.venue_name ?? "");
    setCity(e.city ?? "");
    setStateVal(e.state ?? "");
    setDescription(e.description ?? "");
    setCoverImage(e.cover_image ?? null);
    setListPublic(e.show_in_directory !== false);
    setMode(e.id);
  }

  function sortByDate(list: ClubEvent[]) {
    return [...list].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }

  async function save() {
    if (busy) return;
    if (!title.trim() || !startsAt) {
      setError("A title and date/time are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      starts_at: new Date(startsAt).toISOString(),
      venue_name: venue.trim() || null,
      city: city.trim() || null,
      state: stateVal.trim() || null,
      show_in_directory: listPublic,
      event_type: kind,
      cover_image: kind === "event" ? coverImage : null,
    };
    try {
      if (mode === "new") {
        const slug = `${slugify(title) || "event"}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        const { data, error: e } = await supabase
          .from("events")
          .insert({
            ...payload,
            slug,
            created_by: userId,
            host_kind: "club",
            host_club_id: clubId,
            status: "published",
            is_online: false,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
          .select(
            "id, slug, title, description, starts_at, venue_name, city, state, show_in_directory, event_type, cover_image"
          )
          .single();
        if (e) throw e;
        setEvents((prev) => sortByDate([...prev, data as ClubEvent]));
      } else {
        const id = mode as string;
        const { error: e } = await supabase
          .from("events")
          .update(payload)
          .eq("id", id);
        if (e) throw e;
        setEvents((prev) =>
          sortByDate(
            prev.map((ev) => (ev.id === id ? { ...ev, ...payload } : ev))
          )
        );
      }
      setMode(null);
      router.refresh();
    } catch {
      setError("Couldn't save the event. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from("events").delete().eq("id", id);
    if (e) {
      setError("Couldn't delete the event.");
      setBusy(false);
      setConfirmingId(null);
      return;
    }
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    setBusy(false);
    setConfirmingId(null);
    router.refresh();
  }

  return (
    <div>
      {isOfficer && mode === null && (
        <button
          onClick={openNew}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-ocean-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-600"
        >
          <Plus className="h-4 w-4" /> Add event
        </button>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {error}
        </p>
      )}

      {isOfficer && mode !== null && (
        <div className="mb-6 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4">
          {/* Meeting / Event selector */}
          <div className="mb-3">
            <div className="inline-flex rounded-full border border-ocean-800/60 bg-ocean-950/60 p-1">
              <button
                type="button"
                onClick={() => setKind("meeting")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  kind === "meeting"
                    ? "bg-ocean-600 text-white"
                    : "text-ocean-300 hover:text-white"
                }`}
              >
                Meeting
              </button>
              <button
                type="button"
                onClick={() => setKind("event")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  kind === "event"
                    ? "bg-ocean-600 text-white"
                    : "text-ocean-300 hover:text-white"
                }`}
              >
                Event
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ocean-500">
              {kind === "meeting"
                ? "Simple — just the title, time, and place."
                : "Full — adds a cover image and shows as a rich card."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "meeting"
                  ? "Title (e.g. Monthly Meeting)"
                  : "Title (e.g. Spring Fish Auction)"
              }
              className={inputClass}
            />
            <div>
              <label className="mb-1 block text-xs text-ocean-400">
                Date &amp; time
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputClass}
              />
            </div>
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Location / venue (e.g. Roseville Library, Room B)"
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className={inputClass}
              />
              <input
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                placeholder="State"
                className={inputClass}
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Details (agenda, what to bring, parking…) — optional"
              className={`${inputClass} resize-none`}
            />
            {kind === "event" && (
              <div>
                <label className="mb-1.5 block text-xs text-ocean-400">
                  Cover image
                </label>
                <EventCoverUpload value={coverImage} onChange={setCoverImage} />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-ocean-200">
              <input
                type="checkbox"
                checked={listPublic}
                onChange={(e) => setListPublic(e.target.checked)}
                className="h-4 w-4 rounded border-ocean-700 bg-ocean-900 accent-ocean-500"
              />
              Also list this on the public Events tab
            </label>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-600 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "new" ? "Add" : "Save changes"}
            </button>
            <button
              onClick={() => setMode(null)}
              disabled={busy}
              className="rounded-full bg-ocean-800 px-4 py-2 text-sm text-ocean-200 transition-colors hover:bg-ocean-700 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-10 text-center">
          <CalendarClock className="mx-auto mb-3 h-8 w-8 text-ocean-600" />
          <p className="text-sm text-ocean-400">
            No upcoming events
            {isOfficer ? " — add your next meeting above." : " yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const place = [
              e.venue_name,
              [e.city, e.state].filter(Boolean).join(", "),
            ]
              .filter(Boolean)
              .join(" · ");
            const confirming = confirmingId === e.id;
            const cover = e.event_type === "event" ? e.cover_image : null;
            return (
              <div
                key={e.id}
                className="overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40"
              >
                {cover && (
                  <Link href={`/events/${e.slug}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={e.title}
                      className="h-40 w-full object-cover"
                    />
                  </Link>
                )}
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-emerald-300">
                      {formatWhen(e.starts_at)}
                    </p>
                    <Link
                      href={`/events/${e.slug}`}
                      className="mt-0.5 block font-medium text-white transition-colors hover:text-emerald-300"
                    >
                      {e.title}
                    </Link>
                    {place && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ocean-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {place}
                      </p>
                    )}
                    {isOfficer && (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ocean-500">
                        {e.show_in_directory !== false ? (
                          <>
                            <Globe className="h-3 w-3" /> On Events tab
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> Club only
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  {isOfficer &&
                    (confirming ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => remove(e.id)}
                          disabled={busy}
                          className="rounded-lg bg-coral-500/90 px-3 py-1.5 text-xs text-white transition-colors hover:bg-coral-500 disabled:opacity-60"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          disabled={busy}
                          className="rounded-lg bg-ocean-800 px-3 py-1.5 text-xs text-ocean-200 transition-colors hover:bg-ocean-700 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => openEdit(e)}
                          title="Edit"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-ocean-700/60 bg-ocean-950/80 text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmingId(e.id)}
                          title="Delete"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-ocean-700/60 bg-ocean-950/80 text-ocean-200 transition-colors hover:border-coral-500/50 hover:text-coral-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
