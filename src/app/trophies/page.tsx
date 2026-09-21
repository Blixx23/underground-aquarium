import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TrophyCabinet from "@/components/trophies/TrophyCabinet";
import InviteCard from "@/components/trophies/InviteCard";
import type { TrophyRow } from "@/lib/trophies";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your trophies",
  description: "Every trophy you can earn on Underground Aquarium, and how close you are.",
};

/** Your own trophy cabinet: everything earnable, your progress, your invite link. */
export default async function TrophiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
