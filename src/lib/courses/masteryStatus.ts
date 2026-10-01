import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MASTERY_COOLDOWN_HOURS, MASTERY_SLUG } from "@/lib/courses/mastery";

export type MasteryRequirement = { id: string; slug: string; title: string; done: boolean };

export type MasteryStatus = {
  courseId: string;
  sectionId: string | null;
  requirements: MasteryRequirement[];
  unlocked: boolean;
  passed: boolean;
  /** ISO time a failed attempt's cooldown ends, if still waiting. */
  retryAt: string | null;
  bestScore: number | null;
  attempts: number;
  /** An exam already in progress that can be resumed. */
  openSession: { id: string; expiresAt: string } | null;
};

/**
 * Everything the mastery pages and the grader need to know about one person.
 *
 * Required courses: every published beginner course that's open to everyone,
 * except the mastery exam itself. New beginner courses join the requirement
 * automatically. Reads go through the service client so RLS on progress
 * tables can't hide anything; userId must come from a verified session.
 */
export async function getMasteryStatus(userId: string | null): Promise<MasteryStatus | null> {
  const { data: mastery } = await supabaseAdmin
    .from("courses")
    .select("id")
    .eq("slug", MASTERY_SLUG)
    .eq("is_published", true)
    .maybeSingle();
  if (!mastery) return null;

  const { data: section } = await supabaseAdmin
    .from("course_sections")
    .select("id")
    .eq("course_id", mastery.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Published courses, then keep beginner + open-to-all when those columns exist.
  type Row = { id: string; slug: string; title: string; level?: string | null; members_only?: boolean | null };
  let rows: Row[] = [];
  const withLevels = await supabaseAdmin
    .from("courses")
    .select("id, slug, title, sort_order, level, members_only")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (withLevels.error) {
    const { data } = await supabaseAdmin
      .from("courses")
      .select("id, slug, title, sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    rows = (data ?? []) as Row[];
  } else {
    rows = (withLevels.data ?? []) as Row[];
  }
  const required = rows.filter(
    (r) => r.slug !== MASTERY_SLUG && (r.level ?? "beginner") === "beginner" && !r.members_only
  );

  let doneIds = new Set<string>();
  let passed = false;
  let retryAt: string | null = null;
  let bestScore: number | null = null;
  let attempts = 0;
  let openSession: MasteryStatus["openSession"] = null;

  if (userId) {
    const { data: comps } = await supabaseAdmin
      .from("course_completions")
      .select("course_id")
      .eq("user_id", userId);
    doneIds = new Set((comps ?? []).map((c) => c.course_id as string));
    passed = doneIds.has(mastery.id);

    const { data: tries } = await supabaseAdmin
      .from("course_exam_attempts")
      .select("score, passed, created_at")
      .eq("user_id", userId)
      .eq("course_id", mastery.id)
      .order("created_at", { ascending: false });
    attempts = tries?.length ?? 0;
    bestScore = tries?.length ? Math.max(...tries.map((t) => Number(t.score) || 0)) : null;
    const last = tries?.[0];
    if (!passed && last && !last.passed) {
      const until = new Date(new Date(last.created_at).getTime() + MASTERY_COOLDOWN_HOURS * 3600_000);
      if (until.getTime() > Date.now()) retryAt = until.toISOString();
    }

    if (!passed && section) {
      const { data: open } = await supabaseAdmin
        .from("course_exam_sessions")
        .select("id, expires_at")
        .eq("user_id", userId)
        .eq("section_id", section.id)
        .is("submitted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (open) openSession = { id: open.id, expiresAt: open.expires_at };
    }
  }

  const requirements = required.map((r) => ({ id: r.id, slug: r.slug, title: r.title, done: doneIds.has(r.id) }));
  return {
    courseId: mastery.id,
    sectionId: section?.id ?? null,
    requirements,
    unlocked: requirements.length > 0 && requirements.every((r) => r.done),
    passed,
    retryAt,
    bestScore,
    attempts,
    openSession,
  };
}
