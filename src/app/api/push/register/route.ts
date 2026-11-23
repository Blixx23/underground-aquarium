import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The iPhone app sends its push token here once the person allows
 * notifications (components/app/AppPush.tsx). One phone, one row: if someone
 * else signs in on the same phone, the token moves to them.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  // Apple's device tokens are hex, 64 characters today, longer allowed.
  if (!token || !/^[0-9a-f]{64,200}$/i.test(token)) {
    return NextResponse.json({ error: "Bad token." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("push_devices").upsert(
    { token: token.toLowerCase(), user_id: user.id, platform: "ios", last_seen_at: new Date().toISOString() },
    { onConflict: "token" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
