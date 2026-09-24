import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TERMS_VERSION } from "@/lib/terms";

/**
 * Saves the username a new Google account picked on /welcome, records that
 * they accepted the terms, and clears the "needs a username" flag.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    username?: unknown;
    accepted?: unknown;
  };
  const username = typeof body.username === "string" ? body.username.trim() : "";

  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json(
      { error: "Usernames are 3 to 24 letters, numbers, or underscores. No spaces or symbols." },
      { status: 400 }
    );
  }
  if (body.accepted !== true) {
    return NextResponse.json(
      { error: "Please confirm you are 18 or older and agree to the Terms and Privacy Policy." },
      { status: 400 }
    );
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ username, needs_username: false })
    .eq("id", user.id);

  if (profileError) {
    if (profileError.code === "23505") {
      return NextResponse.json({ error: "That username is taken. Try another." }, { status: 409 });
    }
    return NextResponse.json(
      { error: profileError.message || "Couldn't save your username." },
      { status: 500 }
    );
  }

  // Record terms acceptance the same way the email sign-up does.
  const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      username,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    },
  });
  if (metaError) {
    return NextResponse.json(
      { error: metaError.message || "Couldn't record your terms acceptance." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
