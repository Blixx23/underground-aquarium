import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadLibrary } from "@/lib/species/library";
import { reviewSpeciesRequest } from "@/lib/species/aiReview";
import type { AiReview, AiVerdict, ChrisDecision } from "@/lib/species/fields";

/**
 * Runs the species checker on one request and saves the result. Shared by the
 * admin page (Check again) and the background check that starts the moment a
 * member sends a request, so both behave the same.
 */

type Row = {
  common_name?: string;
  scientific_name?: string | null;
  note?: string | null;
  ai_review?: AiReview | null;
  created_at?: string | null;
};

export type CheckResult = { ok: true; review: AiReview; saved: boolean } | { ok: false; error: string; status: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Which of Chris's three choices a verdict points to. */
function optionFor(v: AiVerdict): ChrisDecision["action"] | null {
  if (v === "add_new" || v === "add_variant") return "create";
  if (v === "another_name") return "alias";
  if (v === "unsure") return null;
  return "dismiss";
}

/**
 * The last 20 times Chris chose differently from the checker, as plain lines
 * for its prompt. Read from the checks themselves, so no extra table.
 */
export async function loadLessons(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("species_suggestions")
    .select("common_name, scientific_name, ai_review")
    .not("ai_review", "is", null)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(300);
  const lines: string[] = [];
  for (const r of (data ?? []) as { common_name: string; scientific_name: string | null; ai_review: AiReview | null }[]) {
    const ai = r.ai_review;
    const d = ai?.chris_decision;
    if (!ai || !d) continue;
    const said = optionFor(ai.verdict);
    const aiTarget = ai.verdict === "another_name" ? ai.alias_slug : ai.verdict === "add_variant" ? ai.parent_slug ?? null : null;
    const same = said === d.action && (d.action === "dismiss" || (aiTarget ?? null) === (d.target ?? null));
    if (same) continue;
    const chose =
      d.action === "create"
        ? d.target
          ? `added it as a variant of ${d.target}`
          : "added it as a new species"
        : d.action === "alias"
          ? `added it as another name for ${d.target ?? "a library fish"}`
          : "turned it down";
    lines.push(
      `- "${r.common_name}"${r.scientific_name ? ` (${r.scientific_name})` : ""}: the checker said ${ai.verdict}${
        aiTarget ? ` (${aiTarget})` : ""
      }; Chris ${chose}.${d.reason ? ` His reason: ${d.reason.slice(0, 200)}` : ""}`
    );
    if (lines.length >= 20) break;
  }
  return lines.join("\n");
}

export async function checkSpeciesRequest(id: string, opts: { force?: boolean; waitForBackground?: boolean } = {}): Promise<CheckResult> {
  const read = async () => {
    const { data } = await supabaseAdmin.from("species_suggestions").select("*").eq("id", id).maybeSingle();
    return data as Row | null;
  };
  let r = await read();
  if (!r?.common_name) return { ok: false, error: "That request is gone.", status: 404 };
  if (r.ai_review && !opts.force) return { ok: true, review: r.ai_review, saved: true };

  // A brand-new request is probably being checked in the background already
  // (it starts when the member sends it). Wait for that instead of paying twice;
  // if it doesn't arrive, this check steps in.
  if (opts.waitForBackground && !opts.force && r.created_at && Date.now() - new Date(r.created_at).getTime() < 5 * 60_000) {
    for (let i = 0; i < 18; i++) {
      await sleep(5000);
      r = await read();
      if (r?.ai_review) return { ok: true, review: r.ai_review, saved: true };
      if (!r) return { ok: false, error: "That request is gone.", status: 404 };
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "The AI isn't set up (ANTHROPIC_API_KEY missing in Vercel).", status: 503 };
  }
  const library = await loadLibrary();
  if (library.length === 0) return { ok: false, error: "Couldn't load the species library.", status: 500 };
  // Lessons are a bonus: a failure here never stops the check.
  const lessons = await loadLessons().catch(() => "");

  try {
    const review = await reviewSpeciesRequest(
      { common_name: r!.common_name!, scientific_name: r!.scientific_name ?? null, note: r!.note ?? null },
      library,
      lessons
    );
    if (lessons && review.steps) {
      review.steps.unshift({
        key: "lessons",
        label: "Your past decisions",
        status: "done",
        note: `Read ${lessons.split("\n").length} times you chose differently from the checker, so it follows your lead.`,
        cents: 0,
      });
    }
    const { error } = await supabaseAdmin
      .from("species_suggestions")
      .update({ ai_review: review, ai_reviewed_at: review.checked_at })
      .eq("id", id);
    return { ok: true, review, saved: !error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The AI check failed.", status: 502 };
  }
}

/** Save what Chris chose on the request's check, so the checker can learn from it. Never fails the caller. */
export async function recordDecision(id: string, decision: ChrisDecision): Promise<void> {
  try {
    const { data } = await supabaseAdmin.from("species_suggestions").select("ai_review").eq("id", id).maybeSingle();
    const ai = (data as { ai_review?: AiReview | null } | null)?.ai_review;
    if (!ai) return;
    await supabaseAdmin
      .from("species_suggestions")
      .update({ ai_review: { ...ai, chris_decision: decision } })
      .eq("id", id);
  } catch {
    /* learning is a bonus; the decision itself is already saved */
  }
}
