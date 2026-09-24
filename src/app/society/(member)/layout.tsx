import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import SocietyNav from "@/components/society/SocietyNav";
import { titleForPoints } from "@/lib/awards/titles";
import { SOCIETY_PATH, SOCIETY_CLUB_PATH } from "@/lib/config";

// Everything here depends on who's asking, so none of it can be static.
export const dynamic = "force-dynamic";

/**
 * The member area shell.
 *
 * Guards the whole subtree in one place: signed out goes to login, and
 * anyone who isn't a member lands on the public pitch at /society rather
 * than on a locked door. A lookup that genuinely failed is neither of
 * those, so it renders an explanation instead of quietly bouncing someone
 * who has paid.
 */
export default async function SocietyMemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSocietyContext();

  if (ctx.error) {
    return (
      <main className="min-h-screen px-6 pb-20 pt-28">
        <div className="mx-auto max-w-lg rounded-2xl border border-coral-500/40 bg-coral-500/10 p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-coral-300" />
          <h1 className="font-display text-xl text-white">
            Couldn&apos;t load your membership
          </h1>
          <p className="mt-2 text-sm text-ocean-300">
            Something went wrong reading the roster, so we can&apos;t tell
            whether you&apos;re a member. Nothing about your membership has
            changed. Try again in a minute.
          </p>
          <p className="mt-4 font-mono text-xs text-ocean-500">{ctx.error}</p>
        </div>
      </main>
    );
  }

  if (!ctx.userId) redirect("/login");
  if (!ctx.society) redirect(SOCIETY_PATH);
  if (!ctx.isMember) redirect(SOCIETY_PATH);

  const supabase = await createClient();

  // Dues lapsed: the whole member area waits behind renewal, records and
  // certificates included. Officers and lifetime members are always in.
  // (Public certificate verification at /verify is unaffected.)
  const { data: goodStanding } = await supabase.rpc("is_in_good_standing", {
    p_club_id: ctx.society.id,
    p_user_id: ctx.userId,
  });
  if (!goodStanding) redirect(SOCIETY_CLUB_PATH);

  // Standing drives the title in the nav plate.
  const { data: standingsData } = await supabase.rpc("club_award_standings", {
    p_club_id: ctx.society.id,
  });
  const mine = ((standingsData as { user_id: string; total_points: number }[] | null) ?? [])
    .find((s) => s.user_id === ctx.userId);
  const points = Number(mine?.total_points ?? 0);

  const { data: ladder } = await supabase
    .from("clubs")
    .select("award_titles")
    .eq("id", ctx.society.id)
    .maybeSingle();

  const title = titleForPoints(
    points,
    (ladder?.award_titles as { title: string; min_points: number }[] | null) ?? null
  );

  const { count: pending } = await supabase
    .from("club_award_submissions")
    .select("id", { count: "exact", head: true })
    .eq("club_id", ctx.society.id)
    .eq("user_id", ctx.userId)
    .eq("status", "pending");

  // Review queue and judge badges in the nav.
  const [{ data: queue }, { data: judgeFlag }] = await Promise.all([
    supabase.rpc("my_review_queue"),
    supabase.rpc("is_society_judge", {
      p_club_id: ctx.society.id,
      p_user_id: ctx.userId,
    }),
  ]);
  const pendingReviews = ((queue as { status: string }[] | null) ?? []).filter(
    (r) => r.status === "pending"
  ).length;

  let judgeQueue = 0;
  if (judgeFlag) {
    const { data: jq } = await supabase.rpc("judge_queue", {
      p_club_id: ctx.society.id,
    });
    judgeQueue = ((jq as unknown[] | null) ?? []).length;
  }

  const lapsed =
    ctx.membership?.paid_through !== null &&
    ctx.membership?.paid_through !== undefined &&
    new Date(ctx.membership.paid_through + "T00:00:00") < new Date() &&
    ctx.membership?.tier !== "lifetime";

  return (
    <main className="min-h-screen px-6 pb-24 pt-24 sm:pt-28">
      <div className="mx-auto max-w-7xl">
        {lapsed && (
          <Link
            href="/society/home"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm text-amber-200 transition-colors hover:border-amber-400/70"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
            Your dues have lapsed. Your records are safe — renew to keep
            submitting.
          </Link>
        )}

        <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
          <SocietyNav
            memberNumber={ctx.membership?.member_number ?? null}
            displayName={ctx.membership?.display_name || "Member"}
            title={title}
            isOfficer={ctx.isOfficer}
            isJudge={Boolean(judgeFlag)}
            pendingSubmissions={pending ?? 0}
            pendingReviews={pendingReviews}
            judgeQueue={judgeQueue}
          />

          <div className="mt-6 min-w-0 lg:mt-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
