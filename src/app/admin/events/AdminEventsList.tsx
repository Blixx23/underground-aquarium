"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  X,
  Loader2,
  CalendarDays,
  MapPin,
  Globe,
  ExternalLink,
} from "lucide-react";

export type QueueEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string | null;
  is_online: boolean;
  online_url: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  capacity: number | null;
  created_at: string | null;
  host_label: string;
  submitter_username: string | null;
  submitter_name: string | null;
};

type Action = "approve" | "decline";

/**
 * Show the time in the event's own time zone, the same way the public event
 * page does, so "7 PM" here means what the member meant. A fixed locale keeps
 * the server and browser renders identical.
 */
function whenLabel(iso: string | null, tz: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || "America/Los_Angeles",
    });
  } catch {
    return d.toISOString();
  }
}

function dayLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminEventsList({
  initialEvents,
}: {
  initialEvents: QueueEvent[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<QueueEvent[]>(initialEvents);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: Action) {
    if (action === "decline" && !confirm("Decline this event? It will be deleted and the member will be told.")) {
      return;
    }
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note: action === "decline" ? note.trim() || null : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setItems((prev) => prev.filter((e) => e.id !== id));
      setDeclining(null);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400">
        No events waiting for approval.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-coral-300 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}
      {items.map((ev) => {
        const who = ev.submitter_username
          ? `@${ev.submitter_username}`
          : ev.submitter_name || "a member";
        const busy = busyId === ev.id;
        const starts = whenLabel(ev.starts_at, ev.timezone);
        const ends = whenLabel(ev.ends_at, ev.timezone);
        const sent = dayLabel(ev.created_at);
        const place = [ev.venue_name, ev.address, ev.city, ev.state, ev.postal_code]
          .filter(Boolean)
          .join(", ");

        return (
          <div
            key={ev.id}
            className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {ev.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ev.cover_image}
                  alt={ev.title}
                  loading="lazy"
                  className="aspect-[1200/630] w-full shrink-0 rounded-xl bg-ocean-950 object-cover sm:w-48"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-ocean-800/50 shrink-0 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-ocean-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide rounded-full bg-ocean-800/60 text-ocean-300 px-2 py-0.5">
                    {ev.host_label}
                  </span>
                  <h3 className="text-white font-medium break-words">{ev.title}</h3>
                </div>
                <p className="text-sm mt-1">
                  {/* Depending on the database rules, a pending event's page may
                      only open for the member who sent it. Everything needed
                      to decide is on this card either way. */}
                  <Link
                    href={`/events/${ev.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300"
                  >
                    Preview event page
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                </p>
                <p className="text-xs text-ocean-500 mt-1">
                  Sent in by {who}
                  {sent ? ` · ${sent}` : ""}
                </p>

                <div className="mt-3 space-y-1.5 text-sm text-ocean-200">
                  <p className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
                    <span>
                      {starts}
                      {ends ? ` to ${ends}` : ""}
                      {ev.timezone ? (
                        <span className="text-ocean-500"> ({ev.timezone})</span>
                      ) : null}
                    </span>
                  </p>
                  {ev.is_online ? (
                    <p className="flex items-start gap-2">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
                      <span className="break-all">
                        Online event
                        {/* Shown as text on purpose: admin screens don't
                            link out to sites we haven't checked. */}
                        {ev.online_url ? `: ${ev.online_url}` : ""}
                      </span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
                      <span>{place || "No location given"}</span>
                    </p>
                  )}
                  {ev.capacity != null && (
                    <p className="text-ocean-400">Capacity: {ev.capacity}</p>
                  )}
                </div>

                {ev.description && (
                  <p className="text-sm text-ocean-300 mt-3 whitespace-pre-line break-words">
                    {ev.description}
                  </p>
                )}
              </div>
            </div>

            {declining === ev.id && (
              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <label
                  htmlFor={`${ev.id}-note`}
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ocean-400"
                >
                  Why? (optional, sent to the member)
                </label>
                <textarea
                  id={`${ev.id}-note`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="e.g. This looks like an ad rather than an event."
                  className="w-full rounded-lg border border-ocean-800/60 bg-ocean-950/60 px-3 py-2 text-sm text-white placeholder:text-ocean-600 focus:border-emerald-500/50 focus:outline-none"
                />
                <button
                  onClick={() => act(ev.id, "decline")}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-coral-500/50 bg-coral-500/10 px-4 py-1.5 text-sm font-medium text-coral-300 hover:bg-coral-500/20 transition-colors disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Decline and delete
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={() => act(ev.id, "approve")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25 transition-colors disabled:opacity-60"
              >
                {busy && declining !== ev.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve
              </button>
              <button
                onClick={() => {
                  setNote("");
                  setDeclining(declining === ev.id ? null : ev.id);
                }}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-300 hover:text-white hover:border-ocean-500 transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" /> Decline
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
