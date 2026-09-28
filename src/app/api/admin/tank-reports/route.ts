import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Action = "dismiss" | "resolve" | "make_private";

const VALID: Action[] = ["dismiss", "resolve", "make_private"];

// Supabase errors are plain objects, not Error instances, so pull the
// readable parts out by hand.
function errText(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; details?: string };
    return [e.message, e.details].filter(Boolean).join(" ") || "Something went wrong.";
  }
  return "Something went wrong.";
}

// Notifications are best-effort: a failed insert should never undo or block
// the moderation action itself.
async function notify(userId: string | null, type: string, title: string, body: string, link: string | null) {
  if (!userId) return;
  try {
    await supabaseAdmin.from("notifications").insert({ user_id: userId, type, title, body, link });
  } catch {
    // swallow, see note above
  }
}

/**
 * Admin decision on a reported community tank. Dismiss and resolve just
 * close the report. Make private turns off is_public on the tank (the same
 * switch its owner uses, and the same thing an account suspension does), then
 * closes every open report on that tank since they're all handled.
 */
export async function POST(req: Request) {
  let body: { id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = body.id;
  const action = body.action as Action | undefined;
  if (!id || !action || !VALID.includes(action)) {
    return NextResponse.json({ error: "Missing report or action." }, { status: 400 });
  }

  // Check permission in code before touching anything with the service role.
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

  const { data: report, error: findErr } = await supabaseAdmin
    .from("tank_reports")
    .select("id, tank_id, reporter_id, status")
    .eq("id", id)
    .maybeSingle();
  if (findErr) {
    const hint = /status/i.test(findErr.message ?? "") ? " Run step58_fixes.sql in Supabase first." : "";
    return NextResponse.json({ error: errText(findErr) + hint }, { status: 500 });
  }
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (report.status !== "open") {
    return NextResponse.json({ error: "This report was already reviewed." }, { status: 409 });
  }

  const tankId = (report.tank_id as string | null) ?? null;
  const reporterId = (report.reporter_id as string | null) ?? null;
  const now = new Date().toISOString();

  let tankName = "a tank";
  let ownerId: string | null = null;
  if (tankId) {
    const { data: tank } = await supabaseAdmin
      .from("tanks")
      .select("id, name, user_id")
      .eq("id", tankId)
      .maybeSingle();
    if (tank) {
      tankName = (tank.name as string) || tankName;
      ownerId = (tank.user_id as string | null) ?? null;
    }
  }
  const tankLink = tankId ? `/tanks/${tankId}` : null;

  // Which reports this decision closes: normally just this one.
  let closeIds = [id];
  let reporterIds = reporterId ? [reporterId] : [];

  if (action === "make_private") {
    if (!tankId) return NextResponse.json({ error: "This report isn't linked to a tank." }, { status: 400 });

    const { error: tankErr } = await supabaseAdmin
      .from("tanks")
      .update({ is_public: false })
      .eq("id", tankId);
    if (tankErr) return NextResponse.json({ error: errText(tankErr) }, { status: 500 });

    // Other open reports on this tank are handled by the same action.
    const { data: others } = await supabaseAdmin
      .from("tank_reports")
      .select("id, reporter_id")
      .eq("tank_id", tankId)
      .eq("status", "open");
    closeIds = Array.from(new Set([id, ...(others ?? []).map((o) => o.id as string)]));
    reporterIds = Array.from(
      new Set(
        [reporterId, ...(others ?? []).map((o) => o.reporter_id as string | null)].filter(
          (x): x is string => Boolean(x)
        )
      )
    );
  }

  const { error: updErr } = await supabaseAdmin
    .from("tank_reports")
    .update({
      status: action === "dismiss" ? "dismissed" : "resolved",
      reviewed_at: now,
      reviewed_by: user.id,
    })
    .in("id", closeIds);
  if (updErr) return NextResponse.json({ error: errText(updErr) }, { status: 500 });

  // Tell whoever reported it how it turned out.
  for (const rid of reporterIds) {
    if (action === "dismiss") {
      await notify(rid, "report", "Report reviewed", `We reviewed your report about ${tankName}. No action was needed.`, tankLink);
    } else if (action === "make_private") {
      // The tank is private now, so there's no public page to send them to.
      await notify(rid, "report", "Report resolved", `Thanks, we took action on ${tankName}, which you reported.`, null);
    } else {
      await notify(rid, "report", "Report resolved", `Your report about ${tankName} has been resolved.`, tankLink);
    }
  }

  // Tell the owner only when their tank was actually changed, and never
  // double-notify someone who reported their own tank.
  if (action === "make_private" && ownerId && !reporterIds.includes(ownerId)) {
    await notify(
      ownerId,
      "moderation",
      "Tank made private",
      `A moderator made your tank ${tankName} private after a community report. You can still see and edit it. Questions? Write to support@undergroundaquarium.com.`,
      tankLink
    );
  }

  if (action === "make_private" && tankId) {
    revalidatePath(`/tanks/${tankId}`);
    revalidatePath("/tanks");
  }

  return NextResponse.json({ ok: true, closed: closeIds });
}
