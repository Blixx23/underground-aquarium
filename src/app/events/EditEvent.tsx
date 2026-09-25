"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_EVENT_IMAGE,
  DEFAULT_EVENT_TZ,
  US_TIMEZONES,
  isoToZonedInput,
  zonedInputToIso,
} from "@/lib/eventTime";
import EventCoverUpload from "./EventCoverUpload";

type EventData = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string | null;
  event_type: string | null;
  is_online: boolean;
  online_url: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  capacity: number | null;
  is_ticketed: boolean | null;
  show_in_directory: boolean | null;
  cover_image: string | null;
};

const inputClass =
  "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40";
const labelClass = "block text-sm text-ocean-200 mb-1.5";
const sectionClass = "space-y-4 border-t border-white/10 pt-5";
const sectionTitle = "text-xs font-semibold uppercase tracking-wider text-ocean-400";

export default function EditEvent({ event }: { event: EventData }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);

  const initialTz = event.timezone || DEFAULT_EVENT_TZ;
  const [timezone, setTimezone] = useState(initialTz);
  const [title, setTitle] = useState(event.title);
  const [eventType, setEventType] = useState(event.event_type === "meeting" ? "meeting" : "event");
  const [description, setDescription] = useState(event.description ?? "");
  const [startsAt, setStartsAt] = useState(isoToZonedInput(event.starts_at, initialTz));
  const [endsAt, setEndsAt] = useState(isoToZonedInput(event.ends_at, initialTz));
  const [isOnline, setIsOnline] = useState(event.is_online);
  const [onlineUrl, setOnlineUrl] = useState(event.online_url ?? "");
  const [venueName, setVenueName] = useState(event.venue_name ?? "");
  const [address, setAddress] = useState(event.address ?? "");
  const [city, setCity] = useState(event.city ?? "");
  const [stateVal, setStateVal] = useState(event.state ?? "");
  const [zip, setZip] = useState(event.postal_code ?? "");
  const [capacity, setCapacity] = useState(event.capacity != null ? String(event.capacity) : "");
  const [isTicketed, setIsTicketed] = useState(!!event.is_ticketed);
  const [showInDirectory, setShowInDirectory] = useState(event.show_in_directory !== false);
  const [coverImage, setCoverImage] = useState(event.cover_image ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zones = US_TIMEZONES.some((z) => z.value === initialTz)
    ? US_TIMEZONES
    : [...US_TIMEZONES, { value: initialTz, label: initialTz.replace(/_/g, " ") }];

  async function save() {
    if (busy) return;
    if (!title.trim() || !startsAt) {
      setError("Title and start time are required.");
      return;
    }
    const startIso = zonedInputToIso(startsAt, timezone);
    const endIso = endsAt ? zonedInputToIso(endsAt, timezone) : null;
    if (!startIso) {
      setError("That start time doesn't look right.");
      return;
    }
    if (endIso && new Date(endIso) <= new Date(startIso)) {
      setError("The end time has to be after the start.");
      return;
    }
    setBusy(true);
    setError(null);

    const place = (v: string) => (!isOnline ? v.trim() || null : null);
    const next = {
      venue_name: place(venueName),
      address: place(address),
      city: place(city),
      state: place(stateVal),
      postal_code: place(zip),
    };
    // A new address needs a new map pin, so let the geocoder pick it up again.
    const moved =
      isOnline !== event.is_online ||
      next.address !== (event.address ?? null) ||
      next.city !== (event.city ?? null) ||
      next.state !== (event.state ?? null) ||
      next.postal_code !== (event.postal_code ?? null);

    try {
      const { error: e } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          event_type: eventType,
          description: description.trim() || null,
          starts_at: startIso,
          ends_at: endIso,
          timezone,
          is_online: isOnline,
          online_url: isOnline ? onlineUrl.trim() || null : null,
          ...next,
          ...(moved ? { lat: null, lng: null } : {}),
          capacity: capacity ? parseInt(capacity, 10) : null,
          is_ticketed: isTicketed,
          show_in_directory: showInDirectory,
          cover_image: coverImage.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);
      if (e) throw e;
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't save changes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!confirm("Delete this event? This can't be undone.")) return;
    setBusy(true);
    try {
      const { error: e } = await supabase.from("events").delete().eq("id", event.id);
      if (e) throw e;
      router.push("/events");
    } catch {
      setError("Couldn't delete the event.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 text-ocean-200 px-4 py-2.5 text-sm font-medium hover:text-white hover:border-emerald-500/40 transition-colors mb-6"
      >
        <Pencil className="w-4 h-4" /> Edit event
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-ocean-950/80 border border-white/10 p-5 sm:p-6 mb-8 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-white text-lg font-medium">Edit event</p>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-lg p-1.5 text-ocean-400 hover:text-white hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <div>
        <label className={labelClass}>Event image</label>
        <EventCoverUpload value={coverImage || null} onChange={(u) => setCoverImage(u ?? "")} />
        {!coverImage && (
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEFAULT_EVENT_IMAGE} alt="" className="h-12 w-24 rounded-md object-cover opacity-80" />
            <p className="text-xs text-ocean-400">No image yet, so the Underground Aquarium party tank shows instead.</p>
          </div>
        )}
      </div>

      {/* Basics */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Basics</p>
        <div>
          <label className={labelClass}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <div className="flex gap-2">
            {(
              [
                ["event", "Event"],
                ["meeting", "Meeting"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setEventType(v)}
                className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                  eventType === v
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-white/5 border-white/10 text-ocean-300 hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className={inputClass}
          />
        </div>
      </div>

      {/* When */}
      <div className={sectionClass}>
        <p className={sectionTitle}>When</p>
        <div>
          <label className={labelClass}>Time zone</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
            {zones.map((z) => (
              <option key={z.value} value={z.value} className="bg-ocean-950">
                {z.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ocean-500">Times below are local to the event.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Starts</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Ends (optional)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Where */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Where</p>
        <label className="flex items-center gap-2 text-sm text-ocean-200">
          <input
            type="checkbox"
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
            className="rounded border-white/20 bg-white/5"
          />
          This is an online event
        </label>

        {isOnline ? (
          <div>
            <label className={labelClass}>Event link (optional)</label>
            <input
              value={onlineUrl}
              onChange={(e) => setOnlineUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Venue name</label>
              <input value={venueName} onChange={(e) => setVenueName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Street address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_90px_120px] gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelClass}>City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  value={stateVal}
                  onChange={(e) => setStateVal(e.target.value.toUpperCase())}
                  maxLength={2}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  inputMode="numeric"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Details</p>
        <div className="max-w-[200px]">
          <label className={labelClass}>Capacity (optional)</label>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ocean-200">
          <input
            type="checkbox"
            checked={isTicketed}
            onChange={(e) => setIsTicketed(e.target.checked)}
            className="rounded border-white/20 bg-white/5"
          />
          Tickets or admission required
        </label>
        <label className="flex items-center gap-2 text-sm text-ocean-200">
          <input
            type="checkbox"
            checked={showInDirectory}
            onChange={(e) => setShowInDirectory(e.target.checked)}
            className="rounded border-white/20 bg-white/5"
          />
          Show on the public events page
        </label>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-5 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-white/10 text-ocean-300 px-4 py-2.5 text-sm hover:text-white hover:border-white/20 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 text-red-300 px-3 py-2.5 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
}
