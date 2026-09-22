import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { setEmailSettings, getEmailSettings } from "@/lib/email/settings";
import { unsuppress, suppress } from "@/lib/email/suppress";
import { dispatchOne, runWorker } from "@/lib/email/queue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  action?: string;
  id?: string;
  ids?: string[];
  email?: string;
  paused?: boolean;
  bulkPaused?: boolean;
  dailyBulkCap?: number;
};

/** Every write the email panel makes. Admins only; the service key does the work. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const action = body.action ?? "";

  try {
    switch (action) {
      // --- the kill switch and the cap -------------------------------
      case "settings": {
        const patch: { paused?: boolean; bulk_paused?: boolean; daily_bulk_cap?: number } = {};
        if (typeof body.paused === "boolean") patch.paused = body.paused;
        if (typeof body.bulkPaused === "boolean") patch.bulk_paused = body.bulkPaused;
        if (body.dailyBulkCap !== undefined) {
          const n = Math.trunc(Number(body.dailyBulkCap));
          if (!Number.isFinite(n) || n < 0 || n > 5000) {
            return NextResponse.json({ error: "Set a daily cap between 0 and 5000." }, { status: 400 });
          }
          patch.daily_bulk_cap = n;
        }
        if (Object.keys(patch).length === 0) {
          return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
        }
        await setEmailSettings(patch, user.id);
        return NextResponse.json({ ok: true, settings: await getEmailSettings() });
      }

      // --- one row -----------------------------------------------------
      case "retry": {
        const ids = body.ids?.length ? body.ids : body.id ? [body.id] : [];
        if (!ids.length) return NextResponse.json({ error: "Nothing selected." }, { status: 400 });
        const { error } = await supabaseAdmin
          .from("email_queue")
          .update({
            status: "pending",
            attempts: 0,
            last_error: null,
            fail_reason: null,
            locked_at: null,
            alerted_at: null,
            scheduled_at: new Date().toISOString(),
          })
          .in("id", ids)
          .eq("status", "failed");
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true, retried: ids.length });
      }

      case "cancel": {
        const ids = body.ids?.length ? body.ids : body.id ? [body.id] : [];
        if (!ids.length) return NextResponse.json({ error: "Nothing selected." }, { status: 400 });
        // Cancelling is recorded, not erased: the row stays in the ledger as
        // a failure with a reason, so the history never has holes in it.
        const { error } = await supabaseAdmin
          .from("email_queue")
          .update({ status: "failed", fail_reason: "other", last_error: "Cancelled from the admin panel", locked_at: null })
          .in("id", ids)
          .eq("status", "pending");
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true, cancelled: ids.length });
      }

      // --- the suppression list ---------------------------------------
      case "unsuppress": {
        if (!body.email) return NextResponse.json({ error: "Which address?" }, { status: 400 });
        await unsuppress(body.email);
        return NextResponse.json({ ok: true });
      }

      case "suppress": {
        if (!body.email) return NextResponse.json({ error: "Which address?" }, { status: 400 });
        await suppress(body.email, "manual", `Added by an admin on ${new Date().toISOString().slice(0, 10)}`);
        return NextResponse.json({ ok: true });
      }

      // --- proving the path works --------------------------------------
      case "test": {
        const to = (body.email || user.email || "").trim();
        if (!to) return NextResponse.json({ error: "No address to send to." }, { status: 400 });
        const when = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
        await dispatchOne({
          kind: "admin_test",
          to,
          ignorePause: true, // the point of a test is to send while paused
          subject: "Underground Aquarium test email",
          html: `<p style="font:15px Helvetica,Arial;">This is a test from the admin panel, sent ${when}.</p>
                 <p style="font:15px Helvetica,Arial;">If it landed in your inbox, the whole path works: queue, provider, DNS and all.</p>`,
          context: { by: user.id },
        });
        return NextResponse.json({ ok: true, to });
      }

      // --- run the worker by hand ---------------------------------------
      case "run": {
        const result = await runWorker({ limit: 40 });
        return NextResponse.json({ ok: true, ...result });
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
