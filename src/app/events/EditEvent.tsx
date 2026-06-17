"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type EventData = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  is_online: boolean;
  online_url: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  capacity: number | null;
  cover_image: string | null;
};

const inputClass =
  "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40";
const labelClass = "block text-sm text-ocean-200 mb-1.5";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEvent({ event }: { event: EventData }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(event.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(event.ends_at));
  const [isOnline, setIsOnline] = useState(event.is_online);
  const [onlineUrl, setOnlineUrl] = useState(event.online_url ?? "");
  const [venueName, setVenueName] = useState(event.venue_name ?? "");
  const [address, setAddress] = useState(event.address ?? "");
  const [city, setCity] = useState(event.city ?? "");
  const [stateVal, setStateVal] = useState(event.state ?? "");
  const [zip, setZip] = useState(event.postal_code ?? "");
  const [capacity, setCapacity] = useState(
    event.capacity != null ? String(event.capacity) : ""
  );
  const [coverImage, setCoverImage] = useState(event.cover_image ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    if (!title.trim() || !startsAt) {
      setError("Title and start time are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          is_online: isOnline,
          online_url: isOnline ? onlineUrl.trim() || null : null,
          venue_name: !isOnline ? venueName.trim() || null : null,
          address: !isOnline ? address.trim() || null : null,
          city: !isOnline ? city.trim() || null : null,
          state: !isOnline ? stateVal.trim() || null : null,
          postal_code: !isOnline ? zip.trim() || null : null,
          capacity: capacity ? parseInt(capacity, 10) : null,
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
      const { error: e } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 text-ocean-300 px-3 py-1.5 text-xs hover:text-white hover:border-white/20 transition-colors mb-6"
      >
        <Pencil className="w-3.5 h-3.5" /> Edit event
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6 space-y-4">
      <p className="text-white font-medium">Edit event</p>

      <div>
        <label className={labelClass}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={inputClass}
        />
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
            <input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>ZIP</label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Capacity (optional)</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Cover image URL (optional)</label>
          <input
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
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