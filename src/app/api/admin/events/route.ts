import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Action = "approve" | "decline";

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
// the decision itself.
async function notify(userId: string | null, title: string, body: string, link: string) {
  if (!userId) return;
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "event",
      title,
      body,
      link,
    });
  } catch {
    // swallow, see note above
  }
}

/**
 * Admin decision on a community event. Approve puts it on the events page;
 * decline deletes it (the same thing the member's own Delete button does),
 * since there's no "declined" status for events. Either way the member who
 * sent it in gets a notice.
 */
export async function POST(req: Request) {
  let body: { id?: string; action?: string; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = body.id;
  const action = body.action as Action | undefined;
  if (!id || (action !== "approve" && action !== "decline")) {
    return NextResponse.json({ error: "Missing event or action." }, { status: 400 });
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

  const { data: ev, error: findErr } = await supabaseAdmin
    .from("events")
    .select("id, slug, title, status, created_by")
    .eq("id", id)
    .maybeSingle();
  if (findErr) return NextResponse.json({ error: errText(findErr) }, { status: 500 });
  if (!ev) return NextResponse.json({ error: "Event not found. It may have been deleted." }, { status: 404 });
  if (ev.status !== "pending") {
    return NextResponse.json({ error: "This event was already reviewed." }, { status: 409 });
  }

  const title = (ev.title as string) || "your event";
  const slug = ev.slug as string;
  const submitter = (ev.created_by as string | null) ?? null;

  if (action === "approve") {
    // The events page only lists rows that are published AND marked to show
    // in the directory. The submit form never sets show_in_directory, so set
    // it here to be sure an approved event actually appears.
    const { error } = await supabaseAdmin
      .from("events")
      .update({ status: "published", show_in_directory: true })
      .eq("id", id)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: errText(error) }, { status: 500 });

    await notify(
      submitter,
      "Your event is live",
      `${title} was approved and is now on the events page.`,
      `/events/${slug}`
    );

    revalidatePath("/events");
    revalidatePath(`/events/${slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ ok: true });
  }

  // Decline. Clear any RSVPs first (only the submitter could have made one
  // on a pending event) so a missing cascade can't block the delete.
  await supabaseAdmin.from("event_rsvps").delete().eq("event_id", id);

  const { error: delErr } = await supabaseAdmin.from("events").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: errText(delErr) }, { status: 500 });

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
  await notify(
    submitter,
    "Event not approved",
    note
      ? `${title} wasn't approved for the events page. ${note}`
      : `${title} wasn't approved for the events page. Questions? Write to support@undergroundaquarium.com.`,
    "/events"
  );

  revalidatePath("/events");
  return NextResponse.json({ ok: true });
}
