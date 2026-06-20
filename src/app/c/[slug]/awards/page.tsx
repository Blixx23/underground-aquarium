import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Send,
  Fish,
  Leaf,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { titleForPoints, type AwardTitle } from "@/lib/awards/titles";

type Standing = {
  user_id: string;
  display_name: string;
  total_points: number;
  bap_points: number;
  hap_points: number;
  entry_count: number;
};

type OwnSub = {
  id: string;
  program: string;
  species_name: string;
  status: string;
  points: number;
  event_date: string | null;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  rejected: "border-coral-500/30 bg-coral-500/10 text-coral-300",
};

export default async function AwardsHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, award_titles")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  const ladder = (club.award_titles as AwardTitle[] | null) ?? [];

  let role: string | null = null;
  let status: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("club_members")
      .select("role, status")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();
    role = me?.role ?? null;
    status = me?.status ?? null;
  }
  const isActiveMember = role !== null && status === "active";

  const header = (
    <>
      <Link
        href={`/c/${slug}`}
        className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {club.name}
      </Link>
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="w-7 h-7 text-amber-300" />
        <h1 className="font-display text-3xl text-white leading-tight">
          Awards &amp; standings
        </h1>
      </div>
    </>
  );

  if (!isActiveMember) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {header}
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center mt-6">
            <p className="text-ocean-300 mb-4">
              {user
                ? `You need to be an active member of ${club.name} to view its awards.`
                : `Sign in and join ${club.name} to take part in its awards program.`}
            </p>
            <Link
              href={`/c/${slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
            >
              Go to {club.name}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: standingsData } = await supabase.rpc("club_award_standings", {
    p_club_id: club.id,
  });
  const standings: Standing[] = (
    (standingsData as Standing[] | null) ?? []
  ).map((s) => ({
    user_id: s.user_id,
    display_name: s.display_name,
    total_points: Number(s.total_points),
    bap_points: Number(s.bap_points),
    hap_points: Number(s.hap_points),
    entry_count: Number(s.entry_count),
  }));

  const { data: ownData } = await supabase
    .from("club_award_submissions")
    .select("id, program, species_name, status, points, event_date, created_at")
    .eq("club_id", club.id)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });
  const own: OwnSub[] = ownData ?? [];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        {header}
        <p className="text-ocean-300 mb-6">
          Earn points for breeding fish and propagating plants. Submit your
          successes and an officer awards the points.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href={`/c/${slug}/awards/submit`}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
          >
            <Send className="w-4 h-4" /> Submit an entry
          </Link>
        </div>

        {/* Leaderboard */}
        <h2 className="font-display text-xl text-white mb-3">Leaderboard</h2>
        {standings.length === 0 ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center text-ocean-400 mb-10">
            No approved entries yet — be the first on the board!
          </div>
        ) : (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 overflow-hidden mb-10">
            {standings.map((s, i) => {
              const isMe = s.user_id === user!.id;
              const title = titleForPoints(s.total_points, ladder);
              return (
                <div
                  key={s.user_id}
                  className={`flex items-center gap-4 px-5 py-4 border-b border-ocean-800/40 last:border-0 ${
                    isMe ? "bg-ocean-800/30" : ""
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      i === 0
                        ? "bg-amber-400/20 text-amber-300"
                        : "bg-ocean-800/60 text-ocean-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-white">
                      {s.display_name}
                      {isMe && <span className="text-ocean-500"> (you)</span>}
                    </p>
                    {title && <p className="text-xs text-amber-300/80">{title}</p>}
                    <p className="text-xs text-ocean-500">
                      {s.bap_points > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Fish className="h-3 w-3" /> {s.bap_points}
                        </span>
                      )}
                      {s.bap_points > 0 && s.hap_points > 0 && " · "}
                      {s.hap_points > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Leaf className="h-3 w-3" /> {s.hap_points}
                        </span>
                      )}
                      {s.bap_points > 0 || s.hap_points > 0 ? " · " : ""}
                      {s.entry_count} {s.entry_count === 1 ? "entry" : "entries"}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="text-lg font-semibold text-white">
                      {s.total_points}
                    </span>
                    <span className="block text-xs text-ocean-500">pts</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Your entries */}
        <h2 className="font-display text-xl text-white mb-3">Your entries</h2>
        {own.length === 0 ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center text-ocean-400">
            You haven&apos;t submitted anything yet.{" "}
            <Link
              href={`/c/${slug}/awards/submit`}
              className="text-ocean-200 underline hover:text-white"
            >
              Submit your first entry
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {own.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-5 py-4"
              >
                {o.program === "hap" ? (
                  <Leaf className="h-4 w-4 shrink-0 text-ocean-400" />
                ) : (
                  <Fish className="h-4 w-4 shrink-0 text-ocean-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-white">{o.species_name}</p>
                  {o.status === "approved" && (
                    <p className="text-xs text-ocean-500">{o.points} pts</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                    statusStyles[o.status] ?? "border-ocean-700/60 text-ocean-300"
                  }`}
                >
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
