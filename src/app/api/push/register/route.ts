import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The iPhone app sends its push token here once the person allows
 * notifications (components/app/AppPush.tsx). One phone, one row: if someone
 * else signs in on the same phone, the token moves to them.
 */
/** Apple tokens are hex; Firebase (Android) tokens are long and use letters, digits, : _ and -. */
function validToken(token: string, platform: string): boolean {
  return platform === "android" ? /^[A-Za-z0-9_:\-]{100,4096}$/.test(token) : /^[0-9a-f]{64,200}$/i.test(token);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { token, platform: rawPlatform, timeZone, badges } = (await request.json().catch(() => ({}))) as {
    token?: string;
    platform?: string;
    timeZone?: string;
    /** True from app builds that can set and clear the icon number (1.0.2+). */
    badges?: boolean;
  };
  // The phone's time zone (e.g. "America/Chicago"), so pushes can wait out the night.
  const tz = typeof timeZone === "string" && /^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$/.test(timeZone) ? timeZone : null;
  const platform = rawPlatform === "android" ? "android" : "ios";
  if (!token || !validToken(token, platform)) {
    return NextResponse.json({ error: "Bad token." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("push_devices").upsert(
    {
      token: platform === "ios" ? token.toLowerCase() : token,
      user_id: user.id,
      platform,
      last_seen_at: new Date().toISOString(),
      ...(tz ? { time_zone: tz } : {}),
      badges: badges === true,
    },
    { onConflict: "token" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
