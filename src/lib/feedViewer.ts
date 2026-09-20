import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/components/feed/Feed";

/** Who's looking, for the composer and card controls. Null when signed out. */
export async function getViewer(): Promise<{
  viewer: Viewer;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { viewer: null, supabase };

  const [{ data: profile }, { data: card }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, full_name, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("society_public_card", { p_user: user.id }),
  ]);
  const c = (Array.isArray(card) ? card[0] : card) as { is_member?: boolean } | null;

  return {
    supabase,
    viewer: {
      id: user.id,
      name: profile?.full_name?.trim() || profile?.username || "You",
      avatar: profile?.avatar_url ?? null,
      society: Boolean(c?.is_member),
      isAdmin: Boolean(profile?.is_admin),
    },
  };
}
