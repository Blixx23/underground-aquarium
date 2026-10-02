import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runWorker } from "@/lib/ops/runner";
import { openFixIssue } from "@/lib/ops/github";
import { isWorkerKey, WORKERS } from "@/lib/ops/workers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Every button on the AI team page. Admins only. Ratings and notes from
 * Chris go into the worker's memory, which is how the team learns.
 */

type Body = Record<string, unknown>;

const s = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return me?.is_admin ? user : null;
}

async function remember(workerKey: string, kind: "rule" | "example", content: string) {
  await supabaseAdmin.from("ops_memory").insert({ worker_key: workerKey, kind, content: content.slice(0, 600), source: "chris" });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const now = new Date().toISOString();

  switch (s(body.action)) {
    case "settings": {
      const patch: Record<string, unknown> = { updated_at: now };
      if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
      if (typeof body.monthly_cap_cents === "number" && body.monthly_cap_cents >= 0 && body.monthly_cap_cents <= 100_000) {
        patch.monthly_cap_cents = Math.round(body.monthly_cap_cents);
      }
      if (typeof body.brief_email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.brief_email)) {
        patch.brief_email = body.brief_email.trim();
      }
      const { error } = await supabaseAdmin.from("ops_settings").update(patch).eq("id", 1);
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
    }

    case "worker_toggle": {
      if (!isWorkerKey(body.key) || typeof body.enabled !== "boolean") {
        return NextResponse.json({ error: "Which worker?" }, { status: 400 });
      }
      if (body.enabled && WORKERS[body.key].needs) {
        return NextResponse.json({ error: WORKERS[body.key].needsNote }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("ops_workers").update({ enabled: body.enabled, updated_at: now }).eq("key", body.key);
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
    }

    case "run": {
      if (!isWorkerKey(body.key)) return NextResponse.json({ error: "Which worker?" }, { status: 400 });
      const outcome = await runWorker(body.key, "manual");
      return NextResponse.json({ ok: outcome.status !== "error", outcome });
    }

    case "finding_status": {
      const status = s(body.status);
      if (!["open", "fixed", "dismissed"].includes(status)) return NextResponse.json({ error: "Bad status." }, { status: 400 });
      const { error } = await supabaseAdmin.from("ops_findings").update({ status, updated_at: now }).eq("id", s(body.id));
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
    }

    case "finding_rate": {
      const rating = body.rating === 1 ? 1 : body.rating === -1 ? -1 : null;
      if (rating === null) return NextResponse.json({ error: "Bad rating." }, { status: 400 });
      const note = s(body.note, 500);
      const { data: f } = await supabaseAdmin
        .from("ops_findings")
        .select("id, worker_key, title, kind, reviewer_verdict")
        .eq("id", s(body.id))
        .maybeSingle();
      if (!f) return NextResponse.json({ error: "No such finding." }, { status: 404 });
      await supabaseAdmin.from("ops_findings").update({ rating, rating_note: note || null, updated_at: now }).eq("id", f.id);
      // Teach the worker.
      if (rating === 1) {
        await remember(f.worker_key, "example", `Chris found this useful: "${f.title}" (${f.kind}).${note ? ` He said: ${note}` : ""}`);
      } else {
        await remember(f.worker_key, "rule", `Chris marked this not worth his time: "${f.title}" (${f.kind}).${note ? ` He said: ${note}` : ""} Don't flag things like this.`);
        // And the reviewer, if it let this through.
        if (f.reviewer_verdict === "approve") {
          await remember("reviewer", "rule", `You approved "${f.title}" but Chris rated it not useful.${note ? ` He said: ${note}` : ""}`);
        }
      }
      return NextResponse.json({ ok: true });
    }

    case "finding_restore": {
      // A finding the reviewer threw out that Chris wants back: the reviewer learns from it.
      const { data: f } = await supabaseAdmin
        .from("ops_findings")
        .select("id, title, reviewer_verdict")
        .eq("id", s(body.id))
        .maybeSingle();
      if (!f) return NextResponse.json({ error: "No such finding." }, { status: 404 });
      await supabaseAdmin.from("ops_findings").update({ status: "open", updated_at: now }).eq("id", f.id);
      if (f.reviewer_verdict === "reject") {
        await remember("reviewer", "rule", `You rejected "${f.title}" but Chris restored it: it was worth his time.`);
      }
      return NextResponse.json({ ok: true });
    }

    case "finding_github": {
      const { data: f } = await supabaseAdmin
        .from("ops_findings")
        .select("id, title, detail, evidence, suggested_action, link, kind")
        .eq("id", s(body.id))
        .maybeSingle();
      if (!f) return NextResponse.json({ error: "No such finding." }, { status: 404 });
      try {
        const url = await openFixIssue(f);
        await supabaseAdmin
          .from("ops_findings")
          .update({ status: "in_progress", github_issue_url: url, updated_at: now })
          .eq("id", f.id);
        return NextResponse.json({ ok: true, url });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
      }
    }

    case "teach": {
      const key = s(body.key);
      const note = s(body.note, 600);
      if (!isWorkerKey(key) || !note) return NextResponse.json({ error: "Which worker, and what should it know?" }, { status: 400 });
      await remember(key, "rule", note);
      return NextResponse.json({ ok: true });
    }

    case "memory_retire": {
      const { error } = await supabaseAdmin
        .from("ops_memory")
        .update({ active: false, retired_at: now })
        .eq("id", s(body.id));
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
