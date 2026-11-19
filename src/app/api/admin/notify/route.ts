import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { broadcastRecipients } from "@/lib/admin/broadcast";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TITLE_MAX = 80;
const BODY_MAX = 300;
const CHUNK = 500;

/**
 * Sends one "Site news" notification to every member (or just to the admin,
 * for a test). Members who get Site news by email are emailed it by the
 * usual notification email job, unless "bell only" is picked.
 */
export async function POST(req: Request) {
  let body: { title?: string; body?: string; link?: string; sendId?: string; test?: boolean; email?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const text = (body.body ?? "").trim();
  const link = (body.link ?? "").trim();
  const sendId = (body.sendId ?? "").trim();
  const test = body.test === true;
  const email = body.email !== false;

  if (!title) return NextResponse.json({ error: "Add a title." }, { status: 400 });
  if (title.length > TITLE_MAX) return NextResponse.json({ error: `Keep the title under ${TITLE_MAX} characters.` }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Add a message." }, { status: 400 });
  if (text.length > BODY_MAX) return NextResponse.json({ error: `Keep the message under ${BODY_MAX} characters.` }, { status: 400 });
  // Site pages only: no outside links in anything the site sends.
  if (link && (!link.startsWith("/") || link.startsWith("//"))) {
    return NextResponse.json({ error: "The link must be a page on the site, starting with /" }, { status: 400 });
  }
  if (!/^[a-z0-9-]{8,64}$/i.test(sendId)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  // A double click or a retry must not send it twice.
  if (!test) {
    const { count } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "site")
      .eq("data->>send_id", sendId);
    if ((count ?? 0) > 0) return NextResponse.json({ error: "This one has already been sent." }, { status: 409 });
  }

  let recipients: string[];
  try {
    recipients = test ? [user.id] : await broadcastRecipients();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't load members." }, { status: 500 });
  }
  // The sender always gets a copy: it's how the page keeps its history.
  if (!recipients.includes(user.id)) recipients.push(user.id);

  const now = new Date().toISOString();
  const data = { broadcast: !test, test, send_id: sendId, sent_to: recipients.length, sent_by: user.id, email };
  const rows = recipients.map((uid) => ({
    user_id: uid,
    type: "site",
    title,
    body: text,
    link: link || null,
    data,
    // Marking it handled keeps the email job from sending it.
    ...(email ? {} : { emailed_at: now }),
  }));

  let sent = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + CHUNK));
    if (error) {
      const msg = error.message || error.details || "Insert failed";
      return NextResponse.json(
        { error: `Stopped after ${sent} of ${rows.length}: ${msg}`, sent },
        { status: 500 }
      );
    }
    sent += Math.min(CHUNK, rows.length - i);
  }

  return NextResponse.json({ sent, test });
}
