import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Called by the app when someone signs out, so the phone stops getting
 * their notifications. Needs only the token, because by then there's no
 * session; the token itself is the proof it's that phone.
 */
export async function POST(request: Request) {
  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  if (!token || !/^[0-9a-f]{64,200}$/i.test(token)) {
    return NextResponse.json({ error: "Bad token." }, { status: 400 });
  }
  await supabaseAdmin.from("push_devices").delete().eq("token", token.toLowerCase());
  return NextResponse.json({ ok: true });
}
