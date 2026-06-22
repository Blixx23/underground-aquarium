import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Trophy,
  Gavel,
  Users,
  ArrowRight,
  Crown,
  Clock,
  CalendarClock,
  MapPin,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PayDuesButton from "./PayDuesButton";
import DuesSuccessBanner from "./DuesSuccessBanner";
import LeaveClubButton from "./LeaveClubButton";
import JoinClubForm from "./JoinClubForm";
import MemberSelfEdit from "./MemberSelfEdit";
import ClubEventsPreview from "./ClubEventsPreview";
import { type ClubEvent } from "./ClubEvents";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

type Standing = {
  user_id: string;
  display_name: string;
  total_points: number;
};

function titleFor(points: number): string | null {
  if (points >= 300) return "Grand Master Breeder";
  if (points >= 150) return "Master Breeder";
  if (points >= 75) return "Advanced Breeder";
  if (points >= 25) return "Breeder";
  if (points >= 1) return "Hobbyist Breeder";
  return null;
}

export default async function ClubHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dues?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id, name, description, logo_url, city, state, dues_amount_cents, stripe_account_id, payouts_enabled, is_public, contact_name, contact_email, contact_phone, public_url"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  let role: string | null = null;
  let status: string | null = null;
  let paidThrough: string | null = null;
  let myName: string | null = null;
  let myEmail: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("club_members")
      .select("role, status, paid_through, display_name, email")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();
    role = me?.role ?? null;
    status = me?.status ?? null;
    paidThrough = me?.paid_through ?? null;
    myName = me?.display_name ?? null;
    myEmail = me?.email ?? null;
  }
  const isApplicant = status === "pending";
  const isMember = role !== null && !isApplicant;
  const isOfficer = role === "owner" || role === "admin" || role === "officer";

  const { count } = await supabase
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq("club_id", club.id)
    .eq("status", "active");
  const memberCount = count ?? 0;

  let standings: Standing[] = [];
  if (isMember) {
    const { data: sData } = await supabase.rpc("club_award_standings", {
      p_club_id: club.id,
    });
    standings = ((sData as Standing[] | null) ?? []).map((s) => ({
      user_id: s.user_id,
      display_name: s.display_name,
      total_points: Number(s.total_points),
    }));
  }

  const canCollect = Boolean(club.stripe_account_id) && club.payouts_enabled;
  const today = new Date();
  const paidThroughDate = paidThrough
    ? new Date(paidThrough + "T00:00:00")
    : null;
  const isPaidCurrent = paidThroughDate ? paidThroughDate >= today : false;
  const duesDue =
    isMember &&
    role !== "owner" &&
    club.dues_amount_cents > 0 &&
    canCollect &&
    !isPaidCurrent;

  const eventCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  let eventsQuery = supabase
    .from("events")
    .select(
      "id, slug, title, description, starts_at, venue_name, city, state, is_online, online_url, show_in_directory, event_type, cover_image"
    )
    .eq("host_club_id", club.id)
    .eq("status", "published")
    .gte("starts_at", eventCutoff);
  // The public and non-members only see events the club chose to make public.
  // Members and officers see everything, including club-only meetings.
  if (!isMember) {
    eventsQuery = eventsQuery.or(
      "show_in_directory.is.null,show_in_directory.eq.true"
    );
  }
  const { data: clubEventsData } = await eventsQuery.order("starts_at", {
    ascending: true,
  });
  const clubEvents = (clubEventsData ?? []) as ClubEvent[];

  // The soonest upcoming meeting visible to this viewer.
  const nextMeeting =
    clubEvents.find((e) => e.event_type === "meeting") ?? null;
  const nextMeetingPlace = nextMeeting
    ? nextMeeting.is_online
      ? "Online"
      : [
          nextMeeting.venue_name,
          [nextMeeting.city, nextMeeting.state].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .join(" · ")
    : "";
  const formatMeetingWhen = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        {sp?.dues === "success" && <DuesSuccessBanner />}

        <div className="flex items-center gap-4 mb-2">
          {club.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.logo_url}
              alt={club.name}
              className="w-14 h-14 rounded-xl object-cover border border-ocean-800/60"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-ocean-800/60 flex items-center justify-center">
              <Users className="w-7 h-7 text-ocean-400" />
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl text-white leading-tight">
              {club.name}
            </h1>
            {(club.city || club.state) && (
              <p className="text-sm text-ocean-400">
                {[club.city, club.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {club.description && (
          <p className="text-ocean-300 mb-6 mt-2">{club.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-8 text-sm text-ocean-400">
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-4 h-4" /> {memberCount} member
            {memberCount === 1 ? "" : "s"}
          </span>
          {club.dues_amount_cents > 0 && (
            <span>· Dues {money(club.dues_amount_cents)}</span>
          )}
          {isMember && role && (
            <span className="inline-flex items-center gap-1.5 capitalize">
              · {role === "owner" && <Crown className="w-4 h-4 text-amber-300" />}
              You&apos;re {role === "owner" ? "the owner" : `a ${role}`}
            </span>
          )}
          {isPaidCurrent && paidThroughDate && (
            <span className="text-emerald-300">
              · Paid through {paidThroughDate.toLocaleDateString()}
            </span>
          )}
        </div>

        {nextMeeting && (
          <Link
            href={`/events/${nextMeeting.slug}`}
            className="group block rounded-2xl border border-ocean-700/60 bg-ocean-800/40 px-6 py-5 mb-6 hover:bg-ocean-800/60 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-ocean-500 mb-1.5">
              <CalendarClock className="w-4 h-4" /> Next meeting
            </span>
            <p className="text-sm font-medium text-emerald-300">
              {formatMeetingWhen(nextMeeting.starts_at)}
            </p>
            <p className="mt-0.5 text-lg font-medium text-white group-hover:text-emerald-300 transition-colors">
              {nextMeeting.title}
            </p>
            {nextMeetingPlace && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ocean-400">
                {nextMeeting.is_online ? (
                  <Globe className="w-4 h-4 shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 shrink-0" />
                )}
                {nextMeetingPlace}
              </p>
            )}
          </Link>
        )}

        {duesDue && (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/10 px-6 py-5 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white font-medium">Membership dues</p>
                <p className="text-sm text-ocean-400">
                  Pay {money(club.dues_amount_cents)} to{" "}
                  {paidThrough ? "renew your membership" : "activate your membership"}.
                </p>
              </div>
              <PayDuesButton
                clubId={club.id}
                label={`Pay ${money(club.dues_amount_cents)} dues`}
              />
            </div>
          </div>
        )}

        {isOfficer && (
          <Link
            href={`/c/${slug}/admin`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-ocean-700/60 bg-ocean-800/40 px-6 py-5 mb-6 hover:bg-ocean-800/60 transition-colors group"
          >
            <span className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-ocean-200" />
              <span>
                <span className="block text-white font-medium">Admin console</span>
                <span className="block text-sm text-ocean-400">
                  Manage members, dues, and club settings
                </span>
              </span>
            </span>
            <ArrowRight className="w-5 h-5 text-ocean-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        <ClubEventsPreview
          clubSlug={slug}
          isOfficer={isOfficer}
          events={clubEvents}
        />

        {(club.contact_name ||
          club.contact_email ||
          club.contact_phone ||
          club.public_url) && (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 mb-6">
            <h2 className="font-display text-lg text-white mb-3">Contact</h2>
            <dl className="space-y-2 text-sm">
              {club.contact_name && (
                <div className="flex gap-3">
                  <dt className="text-ocean-500 w-20 shrink-0">Organizer</dt>
                  <dd className="text-ocean-200">{club.contact_name}</dd>
                </div>
              )}
              {club.contact_email && (
                <div className="flex gap-3">
                  <dt className="text-ocean-500 w-20 shrink-0">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${club.contact_email}`}
                      className="text-ocean-300 hover:text-white transition-colors break-all"
                    >
                      {club.contact_email}
                    </a>
                  </dd>
                </div>
              )}
              {club.contact_phone && (
                <div className="flex gap-3">
                  <dt className="text-ocean-500 w-20 shrink-0">Phone</dt>
                  <dd className="text-ocean-200">{club.contact_phone}</dd>
                </div>
              )}
              {club.public_url && (
                <div className="flex gap-3">
                  <dt className="text-ocean-500 w-20 shrink-0">Website</dt>
                  <dd>
                    <a
                      href={club.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ocean-300 hover:text-white transition-colors break-all"
                    >
                      {club.public_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {isMember ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href={`/c/${slug}/awards`}
                className="rounded-2xl border border-ocean-700/60 bg-ocean-800/40 px-6 py-5 hover:bg-ocean-800/60 transition-colors"
              >
                <Trophy className="w-6 h-6 text-amber-300 mb-3" />
                <p className="text-white font-medium">BAP / HAP</p>
                <p className="text-sm text-ocean-400">
                  Breeder &amp; plant awards — submit entries and climb the
                  leaderboard.
                </p>
              </Link>
              <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-5 opacity-60">
                <Gavel className="w-6 h-6 text-ocean-200 mb-3" />
                <p className="text-white font-medium">Auctions</p>
                <p className="text-sm text-ocean-400">
                  Member auctions — coming soon.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-300" /> Standings
                </h2>
                <Link
                  href={`/c/${slug}/awards`}
                  className="inline-flex items-center gap-1 text-sm text-ocean-300 hover:text-white transition-colors"
                >
                  Full awards <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {standings.length === 0 ? (
                <p className="text-sm text-ocean-400">
                  No approved entries yet — submit one to get on the board.
                </p>
              ) : (
                <div className="space-y-2">
                  {standings.slice(0, 5).map((s, i) => {
                    const isMe = s.user_id === user?.id;
                    const title = titleFor(s.total_points);
                    return (
                      <div
                        key={s.user_id}
                        className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                          isMe ? "bg-ocean-800/40" : ""
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                            i === 0
                              ? "bg-amber-400/20 text-amber-300"
                              : "bg-ocean-800/60 text-ocean-300"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-white text-sm">
                            {s.display_name}
                            {isMe && (
                              <span className="text-ocean-500"> (you)</span>
                            )}
                          </p>
                          {title && (
                            <p className="text-xs text-amber-300/80">{title}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-white">
                          {s.total_points}
                          <span className="text-xs font-normal text-ocean-500">
                            {" "}
                            pts
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <MemberSelfEdit
              clubId={club.id}
              initialName={myName}
              initialEmail={myEmail}
            />
          </>
        ) : isApplicant ? (
          <div className="rounded-2xl border border-amber-700/40 bg-amber-900/10 px-6 py-8 text-center">
            <Clock className="w-8 h-8 text-amber-300/80 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Request pending</p>
            <p className="text-sm text-ocean-400 mb-4">
              Your request to join {club.name} is waiting for an officer to
              approve it. You&apos;ll get a notification when you&apos;re in.
            </p>
            <LeaveClubButton
              clubId={club.id}
              clubName={club.name}
              label="Withdraw request"
            />
          </div>
        ) : user ? (
          club.is_public ? (
            <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center">
              <Users className="w-8 h-8 text-ocean-500 mx-auto mb-3" />
              <p className="text-ocean-300 mb-4">
                Apply to join {club.name}
                {club.dues_amount_cents > 0
                  ? ` — dues are ${money(club.dues_amount_cents)} once approved.`
                  : "."}
              </p>
              <JoinClubForm
                clubId={club.id}
                clubName={club.name}
                defaultName={(user.user_metadata?.username as string) || ""}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center">
              <Users className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
              <p className="text-ocean-300">
                {club.name} is invite-only — ask an officer for an invite.
              </p>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center">
            <Users className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-ocean-300 mb-4">You&apos;re viewing {club.name}.</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
            >
              Sign in to join
            </Link>
          </div>
        )}

        {isMember && role !== "owner" && (
          <div className="mt-10 pt-6 border-t border-ocean-900/60">
            <LeaveClubButton clubId={club.id} clubName={club.name} />
          </div>
        )}
      </div>
    </main>
  );
}
