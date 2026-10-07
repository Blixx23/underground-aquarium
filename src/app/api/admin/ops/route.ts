import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runWorker } from "@/lib/ops/runner";
import { openFixIssue } from "@/lib/ops/github";
import { isWorkerKey, WORKERS } from "@/lib/ops/workers";
import { setupNote } from "@/lib/ops/setup";
import { opsConfigured } from "@/lib/ops/config";
import { proposalFor, sendEmailProposal } from "@/lib/ops/proposals";

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
      const missing = body.enabled ? setupNote(WORKERS[body.key]) : null;
      if (missing) {
        return NextResponse.json({ error: missing }, { status: 400 });
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

    // The three answers on a finding: Yes, No, Something else.
    case "finding_yes": {
      const { data: f } = await supabaseAdmin
        .from("ops_findings")
        .select("id, worker_key, title, detail, evidence, suggested_action, link, kind, proposal, status")
        .eq("id", s(body.id))
        .maybeSingle();
      if (!f) return NextResponse.json({ error: "No such finding." }, { status: 404 });
      if (!["new", "open"].includes(f.status)) return NextResponse.json({ error: "This one is already handled." }, { status: 400 });
      // Chris may have edited the suggestion before saying yes.
      const suggestion = s(body.suggestion, 3000) || f.suggested_action || "";
      const { kind, proposal } = proposalFor(f.kind, f.proposal, opsConfigured().github);
      const done = (patch: Record<string, unknown> = {}) =>
        supabaseAdmin
          .from("ops_findings")
          .update({ status: "fixed", suggested_action: suggestion || null, chris_reply: null, rating: 1, updated_at: now, ...patch })
          .eq("id", f.id);

      if (kind === "email" && proposal?.type === "email") {
        const subject = s(body.subject, 200) || proposal.subject;
        const text = s(body.body, 5000) || proposal.body;
        const { data: settings } = await supabaseAdmin.from("ops_settings").select("brief_email").eq("id", 1).maybeSingle();
        const { sent, skipped } = await sendEmailProposal(
          { subject, body: text, store_ids: proposal.store_ids },
          (settings?.brief_email as string | null) ?? undefined
        );
        if (sent === 0) {
          return NextResponse.json({ error: `Nothing sent. ${skipped.join("; ") || "No shops with an email on file."}` }, { status: 400 });
        }
        await done({ proposal: { ...proposal, subject, body: text } });
        await remember(f.worker_key, "example", `Chris approved and sent "${subject}" for "${f.title}".`);
        const note = skipped.length ? ` Skipped: ${skipped.join("; ")}.` : "";
        return NextResponse.json({ ok: true, message: `Sent to ${sent} shop${sent === 1 ? "" : "s"}.${note}` });
      }

      if (kind === "fix") {
        try {
          const url = await openFixIssue({ ...f, suggested_action: suggestion || null });
          await supabaseAdmin
            .from("ops_findings")
            .update({ status: "in_progress", suggested_action: suggestion || null, chris_reply: null, rating: 1, github_issue_url: url, updated_at: now })
            .eq("id", f.id);
          return NextResponse.json({ ok: true, url, message: "Claude is on it. A preview link will show up on GitHub." });
        } catch (e) {
          return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
        }
      }

      await done();
      if (kind === "approve") {
        // Workers read memory every run, so this is how an approved plan gets carried out.
        await remember(f.worker_key, "rule", `Chris said yes to "${f.title}". Go ahead with: ${suggestion}`);
        return NextResponse.json({ ok: true, message: "Approved. The team will carry it out on its next run." });
      }
      return NextResponse.json({ ok: true, message: "Marked done." });
    }

    case "finding_no": {
      const reason = s(body.reason, 500);
      const { data: f } = await supabaseAdmin
        .from("ops_findings")
        .select("id, worker_key, title, kind, reviewer_verdict")
        .eq("id", s(body.id))
        .maybeSingle();
      if (!f) return NextResponse.json({ error: "No such finding." }, { status: 404 });
      await supabaseAdmin
        .from("ops_findings")
        .update({ status: "dismissed", rating: -1, rating_note: reason || null, chris_reply: null, updated_at: now })
        .eq("id", f.id);
      await remember(
        f.worker_key,
        "rule",
        `Chris said no to "${f.title}" (${f.kind}).${reason ? ` He said: ${reason}` : ""} Don't suggest this again unless something changes.`
      );
      if (f.reviewer_verdict === "approve") {
        await remember("reviewer", "rule", `You approved "${f.title}" but Chris said no.${reason ? ` He said: ${reason}` : ""}`);
      }
      return NextResponse.json({ ok: true, message: "Got it. The team won't bring this up again." });
    }

    case "finding_reply": {
      const text = s(body.text, 1500);
      if (!text) return NextResponse.json({ error: "What would you like instead?" }, { status: 400 });
      const { data: f } = await supabaseAdmin.from("ops_findings").select("id, worker_key, title").eq("id", s(body.id)).maybeSingle();
      if (!f) return NextResponse.json({ error: "No such finding." }, { status: 404 });
      await supabaseAdmin
        .from("ops_findings")
        .update({ chris_reply: text, chris_reply_at: now, status: "open", updated_at: now })
        .eq("id", f.id);
      await remember(f.worker_key, "example", `On "${f.title}" Chris asked for something different: ${text}`);
      if (body.reviseNow === true && isWorkerKey(f.worker_key)) {
        const outcome = await runWorker(f.worker_key, "manual");
        return NextResponse.json({
          ok: outcome.status !== "error",
          message: outcome.status === "error" ? "Saved, but the team couldn't run just now. It will pick this up next run." : "The team has revised it.",
        });
      }
      return NextResponse.json({ ok: true, message: "Sent. The team will revise it on its next run." });
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
