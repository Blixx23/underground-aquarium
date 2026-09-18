import { Trophy, Crown } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { titleForPoints } from "@/lib/awards/titles";
import { SOC_EYEBROW } from "@/lib/society/theme";

export const dynamic = "force-dynamic";

type Standing = {
  user_id: string;
  display_name: string;
  total_points: number | string;
};

export default async function LeaderboardPage() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  const [{ data: sData }, { data: ladderRow }] = await Promise.all([
    supabase.rpc("club_award_standings", { p_club_id: ctx.society!.id }),
    supabase
      .from("clubs")
      .select("award_titles")
      .eq("id", ctx.society!.id)
      .maybeSingle(),
  ]);

  const ladder =
    (ladderRow?.award_titles as { title: string; min_points: number }[] | null) ??
    null;

  const standings = (((sData as Standing[] | null) ?? [])
    .map((s) => ({ ...s, total_points: Number(s.total_points) }))
    .sort((a, b) => b.total_points - a.total_points)) as (Standing & {
    total_points: number;
  })[];

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Standings</p>
      <h1 className="mb-2 font-display text-2xl text-white sm:text-3xl">
        Leaderboard
      </h1>
      <p className="mb-8 max-w-xl text-sm text-ocean-400">
        Every point here was earned on an approved entry that other members
        verified. Nothing is self-reported.
      </p>

      {standings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 py-16 text-center">
          <Trophy className="mx-auto mb-4 h-9 w-9 text-ocean-700" />
          <p className="mb-1 text-lg text-ocean-200">The board is empty</p>
          <p className="mx-auto max-w-sm text-sm text-ocean-500">
            Nobody has an approved entry yet. First one on the board sets the
            pace for everyone who joins after.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {standings.map((s, i) => {
            const isMe = s.user_id === ctx.userId;
            const title = titleForPoints(s.total_points, ladder);
            return (
              <li
                key={s.user_id}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
                  isMe
                    ? "border-amber-500/40 bg-amber-500/[0.07]"
                    : "border-ocean-800/60 bg-ocean-900/40"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm ${
                    i === 0
                      ? "bg-amber-400/20 text-amber-300"
                      : "bg-ocean-800/60 text-ocean-300"
                  }`}
                >
                  {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {s.display_name}
                    {isMe && <span className="text-ocean-500"> (you)</span>}
                  </span>
                  {title && (
                    <span className="block truncate text-xs text-amber-300/80">
                      {title}
                    </span>
                  )}
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-display text-lg text-white">
                    {s.total_points}
                  </span>
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-ocean-600">
                    points
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
