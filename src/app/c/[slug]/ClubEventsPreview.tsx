import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Plus,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import type { ClubEvent } from "./ClubEvents";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClubEventsPreview({
  clubSlug,
  isOfficer,
  events,
}: {
  clubSlug: string;
  isOfficer: boolean;
  events: ClubEvent[];
}) {
  const shown = events.slice(0, 3);
  const eventsHref = `/c/${clubSlug}/events`;

  return (
    <section className="mt-10 mb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg text-white">
          <CalendarDays className="h-5 w-5 text-ocean-300" /> Meetings &amp; events
        </h2>
        {isOfficer && (
          <Link
            href={eventsHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ocean-600"
          >
            <Plus className="h-4 w-4" /> Add event
          </Link>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-10 text-center">
          <CalendarClock className="mx-auto mb-3 h-8 w-8 text-ocean-600" />
          <p className="text-sm text-ocean-400">
            No upcoming events
            {isOfficer ? " — add your next meeting." : " yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((e) => {
            const place = [
              e.venue_name,
              [e.city, e.state].filter(Boolean).join(", "),
            ]
              .filter(Boolean)
              .join(" · ");
            const cover = e.event_type === "event" ? e.cover_image : null;
            return (
              <Link
                key={e.id}
                href={`/events/${e.slug}`}
                className="flex items-center gap-3 rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-3 transition-colors hover:border-ocean-600/70 hover:bg-ocean-900/60"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={e.title}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-ocean-800/60 bg-ocean-950/60 text-emerald-300">
                    <span className="text-[10px] font-medium uppercase">
                      {new Date(e.starts_at).toLocaleString(undefined, {
                        month: "short",
                      })}
                    </span>
                    <span className="text-lg font-semibold leading-none text-white">
                      {new Date(e.starts_at).getDate()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-emerald-300">
                    {formatWhen(e.starts_at)}
                  </p>
                  <p className="truncate font-medium text-white">{e.title}</p>
                  {place && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ocean-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{place}</span>
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <Link
          href={eventsHref}
          className="mt-3 inline-flex items-center gap-1 text-sm text-ocean-300 transition-colors hover:text-white"
        >
          See all events <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}
