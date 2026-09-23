import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { suppress } from "@/lib/email/suppress";
import { normaliseEmail } from "@/lib/email/address";
import { isOurSender } from "@/lib/email/provider";

export const dynamic = "force-dynamic";

/**
 * What happened after Resend accepted the message: delivered, bounced,
 * marked as spam, opened. The API call succeeding only means Resend took
 * it; this is the half that tells you whether it landed.
 *
 * Resend signs with Svix headers. Verified here without the extra
 * dependency: HMAC-SHA256 over "id.timestamp.body" with the secret after
 * "whsec_", base64, compared in constant time.
 */
function verify(secret: string, id: string, ts: string, body: string, header: string): boolean {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const want = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  for (const part of header.split(" ")) {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const a = Buffer.from(sig);
    const b = Buffer.from(want);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

const TYPES: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.delivery_delayed": "delayed",
};

export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = req.headers.get("svix-id") ?? "";
  const ts = req.headers.get("svix-timestamp") ?? "";
  const sig = req.headers.get("svix-signature") ?? "";

  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  if (!id || !ts || !sig || !verify(secret, id, ts, body, sig)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  // Reject anything older than five minutes: a captured request can't be replayed.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
    return NextResponse.json({ error: "Stale" }, { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const type = TYPES[String(event.type ?? "")];
  if (!type) return NextResponse.json({ ok: true, ignored: event.type });

  const d = (event.data ?? {}) as Record<string, unknown>;
  const providerId = typeof d.email_id === "string" ? d.email_id : typeof d.id === "string" ? d.id : null;

  // ---------------------------------------------------------------
  // Whose mail is this?
  //
  // A Resend webhook is set up on the ACCOUNT, not on a domain, so this
  // endpoint is sent events for every domain in the account, including
  // other people's projects. Storing those would put somebody else's
  // recipients in this database and let their bounces suppress
  // addresses here. So: if it wasn't sent from one of our domains, and
  // it doesn't match a message we have a record of sending, we log
  // nothing and say fine.
  // ---------------------------------------------------------------
  const from = typeof d.from === "string" ? d.from : null;

  let queueId: string | null = null;
  if (providerId) {
    const { data: row } = await supabaseAdmin
      .from("email_queue")
      .select("id")
      .eq("provider_id", providerId)
      .maybeSingle();
    queueId = (row as { id: string } | null)?.id ?? null;
  }

  const ours = from ? isOurSender(from) : queueId !== null;
  if (!ours) {
    // 200 on purpose: it is a valid event, just not ours. A non-2xx
    // would have Svix retrying somebody else's mail at us for days.
    return NextResponse.json({ ok: true, ignored: "not this site" });
  }
  const to = Array.isArray(d.to) ? String(d.to[0]) : typeof d.to === "string" ? d.to : null;
  const email = to ? normaliseEmail(to) : null;
  const detail =
    typeof (d.bounce as { message?: string } | undefined)?.message === "string"
      ? ((d.bounce as { message?: string }).message as string)
      : typeof d.reason === "string"
        ? d.reason
        : null;

  const { error } = await supabaseAdmin.from("email_events").insert({
    provider_id: providerId,
    queue_id: queueId,
    to_email: email,
    type,
    detail: detail?.slice(0, 500) ?? null,
    raw: event as unknown as Record<string, unknown>,
  });
  // 23505 means we already logged this one; Svix retries are expected.
  if (error && error.code !== "23505") {
    console.error("[resend webhook] could not log event:", error.message);
    return NextResponse.json({ error: "Could not log" }, { status: 500 });
  }

  // A hard bounce or a spam complaint means never mail that address again.
  if (email && (type === "bounced" || type === "complained")) {
    const bounceType = String((d.bounce as { type?: string } | undefined)?.type ?? "").toLowerCase();
    const soft = bounceType.includes("transient") || bounceType.includes("soft");
    if (type === "complained" || !soft) {
      await suppress(email, type === "complained" ? "complaint" : "bounce", detail ?? undefined);
    }
  }

  return NextResponse.json({ ok: true });
}
