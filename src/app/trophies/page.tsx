import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TrophyCabinet from "@/components/trophies/TrophyCabinet";
import InviteCard from "@/components/trophies/InviteCard";
import { CATEGORY_LABEL, CATEGORY_ORDER, type TrophyRow } from "@/lib/trophies";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trophies",
  description: "Trophies you earn on Underground Aquarium for posting ads, helping in the forums, logging water tests and more. They show on your profile.",
};

/** Your own trophy cabinet: everything earnable, your progress, your invite link. */
export default async function TrophiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Signed-out visitors see what there is to earn instead of a login wall.
  if (!user) return <TrophiesIntro />;

  // Catch up on anything earned since the last check before drawing.
  await supabase.rpc("sync_my_trophies");

  const [{ data: rows }, { data: profile }, { data: refs }] = await Promise.all([
    supabase.rpc("get_trophy_case", { p_user: user.id }),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabase.rpc("my_referrals"),
  ]);
  const r = (Array.isArray(refs) ? refs[0] : refs) as { joined?: number; qualified?: number } | null;

  return (
    <main className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.25em] text-ocean-500">Your cabinet</p>
            <h1 className="font-display text-3xl text-white sm:text-4xl">Trophies</h1>
            <p className="mt-2 max-w-xl text-ocean-300">
              Earned by doing things around the site. They show on your profile, and they can&apos;t be
              faked: every one is counted from what you&apos;ve actually done.
            </p>
          </div>
          {profile?.username && (
            <Link
              href={`/u/${profile.username}?tab=trophies`}
              className="inline-flex items-center gap-1.5 text-sm text-ocean-300 hover:text-white"
            >
              How others see it <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {profile?.username && (
          <div className="mb-10">
            <InviteCard username={profile.username} joined={r?.joined ?? 0} qualified={r?.qualified ?? 0} />
          </div>
        )}

        <TrophyCabinet rows={(rows ?? []) as TrophyRow[]} isSelf />
      </div>
    </main>
  );
}

/** The public version: what trophies are and where they come from, with a way in. */
function TrophiesIntro() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-3xl">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.25em] text-ocean-500">Earned, not bought</p>
        <h1 className="font-display text-3xl text-white sm:text-4xl">Trophies</h1>
        <p className="mt-3 max-w-xl text-ocean-300">
          Every member gets a trophy cabinet. Trophies are earned by doing things around the site, in bronze, silver, gold
          and platinum, and they show on your profile. They can&apos;t be faked: each one is counted from what you&apos;ve
          actually done.
        </p>

        <h2 className="mb-3 mt-10 text-sm font-medium uppercase tracking-wide text-ocean-400">Where they come from</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CATEGORY_ORDER.map((c) => (
            <li
              key={c}
              className="flex items-center gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3 text-sm text-ocean-100"
            >
              <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
              {CATEGORY_LABEL[c] ?? c}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/register?next=/trophies"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
          >
            Join free and start your cabinet <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login?next=/trophies" className="text-sm text-ocean-300 hover:text-white">
            Already a member? Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
