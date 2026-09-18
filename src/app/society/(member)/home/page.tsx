import Link from "next/link";
import { ArrowRight, Fish, Trophy, Medal, Ticket } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { titleForPoints } from "@/lib/awards/titles";
import MemberCard from "@/components/society/MemberCard";
import TrophyCase from "@/components/society/TrophyCase";
import {
  BADGE_COLUMNS,
  type EarnedBadge,
  type SocietyBadge,
} from "@/lib/society/badges";
import { SOC_EYEBROW, SOC_CARD_LINK } from "@/lib/society/theme";

export const dynamic = "force-dynamic";

export default async function SocietyHome() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();
  const societyId = ctx.society!.id;

  await supabase.rpc("sync_member_badges", {
    p_user_id: ctx.userId,
    p_club_id: societyId,
  });

  const [
    { data: standingsData },
    { data: ladderRow },
    { data: subs },
    { data: cat },
    { data: mineBadges },
    { count: roster },
  ] = await Promise.all([
    supabase.rpc("club_award_standings", { p_club_id: societyId }),
    supabase.from("clubs").select("award_titles").eq("id", societyId).maybeSingle(),
    supabase
      .from("club_award_submissions")
      .select("id, status, points")
      .eq("club_id", societyId)
      .eq("user_id", ctx.userId),
    supabase.from("society_badges").select(BADGE_COLUMNS).order("sort_order"),
    supabase
      .from("member_badges")
      .select(`earned_at, detail, society_badges(${BADGE_COLUMNS})`)
      .eq("user_id", ctx.userId)
      .eq("club_id", societyId),
    supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", societyId)
      .eq("status", "active"),
  ]);

  const standings =
    (standingsData as { user_id: string; total_points: number }[] | null) ?? [];
  const myPoints = Number(
    standings.find((s) => s.user_id === ctx.userId)?.total_points ?? 0
  );
  const ladder =
    (ladderRow?.award_titles as { title: string; min_points: number }[] | null) ??
    null;
  const title = titleForPoints(myPoints, ladder);

  const rank =
    standings
      .slice()
      .sort((a, b) => Number(b.total_points) - Number(a.total_points))
      .findIndex((s) => s.user_id === ctx.userId) + 1;

  const rows = (subs ?? []) as { status: string }[];
  const approved = rows.filter((r) => r.status === "approved").length;
  const pending = rows.filter((r) => r.status === "pending").length;

  const badges = ((mineBadges ?? []) as unknown as {
    earned_at: string;
    detail: string | null;
    society_badges: SocietyBadge | null;
  }[])
    .filter((r) => r.society_badges)
    .map((r) => ({
      ...(r.society_badges as SocietyBadge),
      earned_at: r.earned_at,
      detail: r.detail,
    })) as EarnedBadge[];

  // The next rung on the ladder, so the number on screen has somewhere to go.
  const nextTier = (ladder ?? [])
    .filter((t) => t.min_points > myPoints)
    .sort((a, b) => a.min_points - b.min_points)[0];

  const stats = [
    { label: "Points", value: myPoints.toLocaleString() },
    { label: "Approved", value: approved },
    { label: "Pending", value: pending },
    {
      label: "Rank",
      value: rank > 0 && myPoints > 0 ? `#${rank}` : "—",
    },
  ];

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Member area</p>
      <h1 className="mb-6 font-display text-2xl text-white sm:text-3xl">
        Overview
      </h1>

      <MemberCard
        className="mb-6"
        name={ctx.membership?.display_name || "Member"}
        memberNumber={ctx.membership?.member_number ?? null}
        joinedAt={ctx.membership?.joined_at ?? null}
        title={title}
        tier={ctx.membership?.tier ?? null}
        paidThrough={ctx.membership?.paid_through ?? null}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ocean-500">
              {s.label}
            </p>
            <p className="mt-1.5 font-display text-2xl text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {nextTier && (
        <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
          <p className="text-sm text-amber-100/70">
            <span className="font-medium text-white">
              {nextTier.min_points - myPoints} points
            </span>{" "}
            to <span className="text-amber-300">{nextTier.title}</span>.
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ocean-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((myPoints / nextTier.min_points) * 100)
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            href: "/society/breeder",
            label: "Start a Spawn Log",
            desc: "Register a pair before they breed. That's how an entry begins.",
            Icon: Fish,
          },
          {
            href: "/society/leaderboard",
            label: "Leaderboard",
            desc: `${roster ?? 0} member${roster === 1 ? "" : "s"} on the roster.`,
            Icon: Trophy,
          },
          {
            href: "/society/raffle",
            label: "Raffle",
            desc: "Entries you've earned this period.",
            Icon: Ticket,
          },
        ].map(({ href, label, desc, Icon }) => (
          <Link key={href} href={href} className={`group ${SOC_CARD_LINK} p-5`}>
            <Icon className="mb-3 h-5 w-5 text-amber-300" />
            <p className="flex items-center gap-1.5 font-medium text-white">
              {label}
              <ArrowRight className="h-3.5 w-3.5 text-amber-500/60 transition-transform group-hover:translate-x-1" />
            </p>
            <p className="mt-1 text-sm text-amber-100/55">{desc}</p>
          </Link>
        ))}
      </div>

      {badges.length === 0 && (
        <div className="mb-6 rounded-2xl border border-dashed border-ocean-800/60 p-6 text-center">
          <Medal className="mx-auto mb-3 h-7 w-7 text-ocean-700" />
          <p className="text-sm text-ocean-400">
            No badges yet. Your membership milestone appears as soon as the
            roster syncs.
          </p>
        </div>
      )}

      <TrophyCase
        catalogue={(cat ?? []) as unknown as SocietyBadge[]}
        earned={badges}
        showLocked
        heading="Your trophy case"
      />
    </div>
  );
}
