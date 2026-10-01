import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSocietyContext } from "@/lib/society/membership";

/**
 * Can the signed-in person take members-only (Society) courses?
 *
 * Yes for site admins, so courses can be built and previewed, and for
 * Society members in good standing. Lapsed members are treated like the
 * rest of the member area treats them: renew first.
 */
export async function canTakeMembersCourses(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (me?.is_admin) return true;

  const ctx = await getSocietyContext();
  if (!ctx.isMember || !ctx.society) return false;
  const { data: goodStanding } = await supabase.rpc("is_in_good_standing", {
    p_club_id: ctx.society.id,
    p_user_id: user.id,
  });
  return Boolean(goodStanding);
}

/**
 * Reads level and members_only for a course, tolerating a database that
 * hasn't had the course_levels SQL yet (everything is then beginner, open).
 */
export async function courseAccessInfo(
  courseId: string
): Promise<{ level: string; members_only: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("level, members_only")
    .eq("id", courseId)
    .maybeSingle();
  if (error || !data) return { level: "beginner", members_only: false };
  return {
    level: (data as { level?: string }).level ?? "beginner",
    members_only: Boolean((data as { members_only?: boolean }).members_only),
  };
}
