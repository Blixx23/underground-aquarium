import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Called by the app when someone signs out, so the phone stops getting
 * their notifications. Needs only the token, because by then there's no
 * session; the token itself is the proof it's that phone.
 */
export async function POST(request: Request) {
  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  if (!token || !/^[A-Za-z0-9_:\-]{64,4096}$/.test(token)) {
    return NextResponse.json({ error: "Bad token." }, { status: 400 });
  }
  // Apple tokens are stored lowercase; Android ones exactly as given.
  await supabaseAdmin.from("push_devices").delete().in("token", [token, token.toLowerCase()]);
  return NextResponse.json({ ok: true });
}
