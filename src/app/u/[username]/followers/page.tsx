import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import PeopleList, { type Person } from "@/components/PeopleList";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ username: string }> };
type Prof = { id: string; username: string | null; full_name: string | null };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: `Followers — @${username}` };
}

export default async function FollowersPage({ params }: Params) {
  const { username } = await params;

  const { data: profileData } = await supabasePublic
    .from("profiles")
    .select("id, username, full_name")
    .eq("username", username)
    .maybeSingle();
  if (!profileData) notFound();
  const profile = profileData as Prof;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // People who follow this profile (newest first)
  const { data: followRows } = await supabasePublic
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", profile.id)
    .order("created_at", { ascending: false });

  const ids = ((followRows ?? []) as { follower_id: string }[]).map(
    (r) => r.follower_id
  );

  let people: Person[] = [];
  if (ids.length > 0) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id, username, full_name")
      .in("id", ids);

    let viewerFollows = new Set<string>();
    if (user) {
      const { data: mine } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", ids);
      viewerFollows = new Set(
        ((mine ?? []) as { following_id: string }[]).map((r) => r.following_id)
      );
    }

    const byId = new Map(((profs ?? []) as Prof[]).map((p) => [p.id, p]));
    people = ids
      .map((id) => byId.get(id))
      .filter((p): p is Prof => !!p)
      .map((p) => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        initialFollowing: viewerFollows.has(p.id),
        isSelf: !!user && user.id === p.id,
      }));
  }

  const displayName = profile.full_name || profile.username || "Aquarist";

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/u/${profile.username}`}
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {displayName}
          </Link>
        </div>
        <h1 className="font-display text-3xl text-white mb-6">Followers</h1>
        <PeopleList
          people={people}
          emptyText={`${displayName} has no followers yet.`}
        />
      </div>
    </main>
  );
}