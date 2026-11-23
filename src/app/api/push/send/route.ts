import { NextResponse } from "next/server";
import { pushNotificationById } from "@/lib/push/send";

export const dynamic = "force-dynamic";

/**
 * The database pings this the moment a bell notification is created (see
 * supabase/migrations/0087_push_devices.sql). No secret needed: it only
 * pushes a real notification that's under 15 minutes old and hasn't been
 * pushed yet, to the person it belongs to, once. Anyone calling it can't
 * make it do more than the database already asked for.
 */
export async function POST(request: Request) {
  const { id: raw } = (await request.json().catch(() => ({}))) as { id?: string | number };
  const id = raw === undefined || raw === null ? "" : String(raw);
  if (!id || !/^([0-9a-f-]{36}|\d{1,19})$/i.test(id)) {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }
  try {
    const sent = await pushNotificationById(id);
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    console.error("[push send]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
