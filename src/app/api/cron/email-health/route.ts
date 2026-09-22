import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { dispatchOne } from "@/lib/email/queue";
import type { EmailHealth } from "@/lib/email/health";

export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Writes to the admin only when something is actually wrong, and says
 * which kind of wrong in the subject line. Failed rows are reported once
 * each (alerted_at), and only stamped after the alert really sent.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = process.env.ADMIN_ALERT_EMAIL;
  const { data, error } = await supabaseAdmin.rpc("email_health");
  if (error) {
    // The check itself failing is not "ok". Say so, loudly.
    console.error("[email health] could not read health:", error.message);
    if (admin) {
      await dispatchOne({
        kind: "email_alert",
        to: admin,
        ignorePause: true,
        subject: "Action needed: the email health check can't run",
        html: `<p>The health query failed: ${esc(error.message)}</p>
               <p>That usually means a migration hasn't run in production.</p>`,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const h = data as unknown as EmailHealth;

  // Rows that gave up and haven't been reported yet.
  const { data: newFails } = await supabaseAdmin
    .from("email_queue")
    .select("id, kind, to_email, fail_reason, last_error")
    .eq("status", "failed")
    .is("alerted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  const fails = (newFails ?? []) as { id: string; kind: string; to_email: string; fail_reason: string | null; last_error: string | null }[];

  const stuck = h.paused ? 0 : h.stuck;
  if (stuck === 0 && fails.length === 0) {
    return NextResponse.json({ ok: true, quiet: true, health: h });
  }

  const byReason = new Map<string, number>();
  for (const f of fails) byReason.set(f.fail_reason ?? "other", (byReason.get(f.fail_reason ?? "other") ?? 0) + 1);
  const onlyAddresses = fails.length > 0 && [...byReason.keys()].every((k) => k === "address");

  const subject = stuck > 0
    ? `Action needed: emails are not going out (${stuck} stuck)`
    : onlyAddresses
      ? `${fails.length} bad email address${fails.length === 1 ? "" : "es"}, everything else is sending fine`
      : `${fails.length} email${fails.length === 1 ? "" : "s"} didn't send, nothing is stuck`;

  const banner = stuck > 0
    ? `<p style="background:#fdecec;border-left:4px solid #d64545;padding:12px 14px;font:15px Helvetica,Arial;">
         <strong>Mail is not going out.</strong> ${stuck} message${stuck === 1 ? " has" : "s have"} been waiting more than 30 minutes, which means the worker isn't running.</p>`
    : `<p style="background:#eaf7ee;border-left:4px solid #2e9e57;padding:12px 14px;font:15px Helvetica,Arial;">
         <strong>Sending is working.</strong> ${h.sent_24h} went out in the last 24 hours. The note below is about individual failures.</p>`;

  const lines = [...byReason.entries()].map(([reason, n]) => {
    const label = reason === "address" ? "bad or dead address"
      : reason === "rate" ? "we were sending too fast"
      : reason === "provider" ? "Resend had a problem"
      : "something else";
    return `<li>${n} · ${label}</li>`;
  }).join("");

  const examples = fails.slice(0, 10)
    .map((f) => `<li>${esc(f.to_email)} — ${esc(f.kind)} — ${esc((f.last_error ?? "").slice(0, 120))}</li>`)
    .join("");

  const html = `${banner}
    <p style="font:15px Helvetica,Arial;">Pending: ${h.pending} · Sent 24h: ${h.sent_24h} · Failed 24h: ${h.failed_24h}
      · Bounced 7d: ${h.bounced_7d} · Spam complaints 7d: ${h.complained_7d}</p>
    ${fails.length ? `<p style="font:15px Helvetica,Arial;"><strong>Gave up on ${fails.length}:</strong></p><ul style="font:14px Helvetica,Arial;">${lines}</ul>
      <ul style="font:13px Helvetica,Arial;color:#55606b;">${examples}</ul>` : ""}
    <p style="font:14px Helvetica,Arial;"><a href="https://www.undergroundaquarium.com/admin/email">Open the email panel</a></p>`;

  if (!admin) return NextResponse.json({ ok: false, error: "ADMIN_ALERT_EMAIL is not set", health: h }, { status: 500 });

  try {
    await dispatchOne({ kind: "email_alert", to: admin, subject, html, ignorePause: true });
  } catch (e) {
    // Alert didn't send: leave the rows unstamped so the next run tries again.
    const message = e instanceof Error ? e.message : "alert failed";
    return NextResponse.json({ ok: false, error: message, health: h }, { status: 500 });
  }

  if (fails.length) {
    await supabaseAdmin
      .from("email_queue")
      .update({ alerted_at: new Date().toISOString() })
      .in("id", fails.map((f) => f.id));
  }

  return NextResponse.json({ ok: true, alerted: true, stuck, failed: fails.length });
}
