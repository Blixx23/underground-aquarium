"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Store = { id: string; name: string };

const inputClass =
  "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40";
const labelClass = "block text-sm text-ocean-200 mb-1.5";

export default function SubmitEventForm({
  userId,
  stores,
}: {
  userId: string;
  stores: Store[];
}) {
  const [supabase] = useState(() => createClient());
  const [host, setHost] = useState("member");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUrl, setOnlineUrl] = useState("");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [capacity, setCapacity] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ slug: string; published: boolean } | null>(
    null
  );

  const isStore = host !== "member";

  async function submit() {
    if (busy) return;
    if (!title.trim() || !startsAt) {
      setError("A title and start date/time are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const slugBase = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
      const slug = `${slugBase || "event"}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const { data, error: insErr } = await supabase
        .from("events")
        .insert({
          slug,
          created_by: userId,
          host_kind: isStore ? "store" : "member",
          host_store_id: isStore ? host : null,
          title: title.trim(),
          description: description.trim() || null,
          cover_image: coverImage.trim() || null,
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
          status: isStore ? "published" : "pending",
        })
        .select("slug")
        .single();
      if (insErr) throw insErr;
      const row = data as { slug: string };
      setDone({ slug: row.slug, published: isStore });
    } catch {
      setError(
        "Couldn't submit the event. Please check your details and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6">
        <p className="text-white font-medium mb-2">
          {done.published
            ? "Your event is live!"
            : "Thanks — your event was submitted!"}
        </p>
        <p className="text-ocean-200 text-sm mb-4">
          {done.published
            ? "It's now published on the events page."
            : "We review community submissions before they go public. You'll see it on the events page once it's approved."}
        </p>
        <div className="flex gap-3">
          {done.published && (
            <Link
              href={`/events/${done.slug}`}
              className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
            >
              View event
            </Link>
          )}
          <Link
            href="/events"
            className="rounded-lg border border-white/10 text-ocean-300 px-4 py-2.5 text-sm hover:text-white hover:border-white/20 transition-colors"
          >
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {stores.length > 0 && (
        <div>
          <label className={labelClass}>Posting as</label>
          <select
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className={inputClass}
          >
            <option value="member">Community event (you)</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (your shop)
              </option>
            ))}
          </select>
          <p className="text-ocean-500 text-xs mt-1.5">
            {isStore
              ? "Shop events publish right away."
              : "Community events are reviewed before they go public."}
          </p>
        </div>
      )}

      <div>
        <label className={labelClass}>Event title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Spring Frag Swap"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What's happening, who should come, what to bring..."
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
              placeholder="e.g. Rocklin Community Center"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
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
                placeholder="CA"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>ZIP</label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="95677"
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
            placeholder="Leave blank for unlimited"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Cover image URL (optional)</label>
          <input
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        onClick={submit}
        disabled={busy || !title.trim() || !startsAt}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-5 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit event"}
      </button>
    </div>
  );
}