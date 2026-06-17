"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function EventRsvp({
  eventId,
  currentUserId,
  initialStatus,
  initialGoingCount,
  capacity,
}: {
  eventId: string;
  currentUserId: string | null;
  initialStatus: "going" | "interested" | null;
  initialGoingCount: number;
  capacity: number | null;
}) {
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<"going" | "interested" | null>(
    initialStatus
  );
  const [goingCount, setGoingCount] = useState(initialGoingCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFull =
    capacity != null && goingCount >= capacity && status !== "going";

  async function choose(target: "going" | "interested") {
    if (busy || !currentUserId) return;
    setBusy(true);
    setError(null);
    const prev = status;
    const next = prev === target ? null : target; // tapping the active one clears it
    try {
      // Clear any existing RSVP for this user + event
      const { error: delErr } = await supabase
        .from("event_rsvps")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", currentUserId);
      if (delErr) throw delErr;

      if (next) {
        const { error: insErr } = await supabase
          .from("event_rsvps")
          .insert({ event_id: eventId, user_id: currentUserId, status: next });
        if (insErr) throw insErr;
      }

      setStatus(next);
      const wasGoing = prev === "going";
      const nowGoing = next === "going";
      if (wasGoing && !nowGoing) setGoingCount((c) => Math.max(0, c - 1));
      if (!wasGoing && nowGoing) setGoingCount((c) => c + 1);
    } catch {
      setError("Couldn't update your RSVP. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!currentUserId) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <p className="text-ocean-200 text-sm mb-3">{goingCount} going</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
        >
          Sign in to RSVP
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <p className="text-white font-medium mb-3">
        {goingCount} going
        {capacity != null ? ` · ${capacity} spots total` : ""}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => choose("going")}
          disabled={busy || isFull}
          className={
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors disabled:opacity-50 " +
            (status === "going"
              ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-200"
              : "bg-white/5 border-white/10 text-ocean-300 hover:text-white hover:border-white/20")
          }
        >
          <Check className="w-4 h-4" />
          {status === "going" ? "Going" : isFull ? "Full" : "I'm going"}
        </button>
        <button
          onClick={() => choose("interested")}
          disabled={busy}
          className={
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors disabled:opacity-50 " +
            (status === "interested"
              ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-200"
              : "bg-white/5 border-white/10 text-ocean-300 hover:text-white hover:border-white/20")
          }
        >
          <Star className="w-4 h-4" /> Interested
        </button>
      </div>
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
    </div>
  );
}