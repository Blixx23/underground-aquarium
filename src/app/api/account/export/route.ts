import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, bio, location, website, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: tanks } = await supabase
    .from("tanks")
    .select("*")
    .eq("user_id", user.id);

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("owner_id", user.id);

  // Everything else you've made, keyed by the column that says it's yours.
  // A table that isn't readable just comes back empty rather than failing the export.
  const mine = async (table: string, column: string, select = "*") => {
    const { data } = await supabase.from(table).select(select).eq(column, user.id);
    return data ?? [];
  };
  const [
    listings,
    feedPosts,
    forumPosts,
    messagesSent,
    waterLogs,
    storeReviews,
    spawnLogs,
    certificates,
    trophies,
    courses,
  ] = await Promise.all([
    mine("listings", "user_id"),
    mine("feed_posts", "user_id"),
    mine("forum_posts", "author_id"),
    mine("listing_messages", "sender_id"),
    mine("water_logs", "user_id"),
    mine("store_reviews", "user_id"),
    mine("spawn_logs", "user_id"),
    mine("society_certificates", "user_id"),
    mine("user_trophies", "user_id"),
    mine("course_completions", "user_id"),
  ]);

  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id, role, status, joined_at")
    .eq("user_id", user.id);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const payload = {
    exported_at: new Date().toISOString(),
    note: "This is a copy of the personal data Underground Aquarium holds about your account.",
    account: {
      id: user.id,
      email: user.email,
      username: meta.username ?? null,
      created_at: user.created_at,
      terms_accepted_at: meta.terms_accepted_at ?? null,
      terms_version: meta.terms_version ?? null,
    },
    profile: profile ?? null,
    tanks: tanks ?? [],
    stores: stores ?? [],
    listings,
    feed_posts: feedPosts,
    forum_posts: forumPosts,
    messages_sent: messagesSent,
    water_logs: waterLogs,
    store_reviews: storeReviews,
    course_completions: courses,
    club_memberships: memberships ?? [],
    spawn_logs: spawnLogs,
    certificates,
    trophies,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="underground-aquarium-data-${user.id.slice(
        0,
        8
      )}.json"`,
    },
  });
}
