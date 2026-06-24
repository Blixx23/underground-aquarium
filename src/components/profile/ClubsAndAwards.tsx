import Link from "next/link";
import { Trophy, Fish, Leaf, Users, Crown } from "lucide-react";
import { titleForPoints, type AwardTitle } from "@/lib/awards/titles";

export type ClubAward = {
  club_id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  role: string | null;
  officer_title: string | null;
  award_titles: AwardTitle[] | null;
  total_points: number | string;
  bap_points: number | string;
  hap_points: number | string;
  entry_count: number | string;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  officer: "Officer",
  member: "Member",
};

export default function ClubsAndAwards({
  rows,
  heading = "Clubs & awards",
  emptyText,
}: {
  rows: ClubAward[];
  heading?: string;
  emptyText?: string;
}) {
  if (!rows || rows.length === 0) {
    if (!emptyText) return null;
    return (
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-white">
          <Trophy className="h-5 w-5 text-amber-300" /> {heading}
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-ocean-300">{emptyText}</p>
          <Link
            href="/clubs/discover"
            className="mt-2 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            Find clubs near you →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-white">
        <Trophy className="h-5 w-5 text-amber-300" /> {heading}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((r) => {
          const total = Number(r.total_points) || 0;
          const bap = Number(r.bap_points) || 0;
          const hap = Number(r.hap_points) || 0;
          const title = titleForPoints(total, r.award_titles);
          const role = r.role ? ROLE_LABEL[r.role] ?? r.role : null;
          const leadershipLabel = r.officer_title || role;
          return (
            <Link
              key={r.club_id}
              href={`/c/${r.slug}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-amber-400/40 hover:bg-white/10"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ocean-800/60">
                  {r.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.logo_url}
                      alt={r.name}
                      className="h-full w-full object-cover"
                    />
                  ) : r.role === "owner" ? (
                    <Crown className="h-5 w-5 text-amber-300" />
                  ) : (
                    <Users className="h-5 w-5 text-ocean-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium text-white">{r.name}</h3>
                    {leadershipLabel && (
                      <span className="shrink-0 rounded-full border border-ocean-700/60 bg-ocean-800/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ocean-300">
                        {leadershipLabel}
                      </span>
                    )}
                  </div>
                  {title ? (
                    <p className="mt-0.5 text-sm font-medium text-amber-300/90">
                      {title}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-ocean-500">Member</p>
                  )}
                  {total > 0 && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-ocean-400">
                      <span className="font-semibold text-white">
                        {total} pts
                      </span>
                      {bap > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Fish className="h-3 w-3" /> {bap}
                        </span>
                      )}
                      {hap > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Leaf className="h-3 w-3" /> {hap}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
