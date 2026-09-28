import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";

/**
 * Where sign-in links land: the sign-up confirmation email (a one-time code
 * or a token hash) and "Continue with Google" (a code). Signs the person in,
 * then sends them on. A brand-new Google account has no chosen username yet,
 * so it goes to /welcome first to pick one and accept the terms.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"), "/feed");

  // A suspended (banned) member who tries "Continue with Google" is sent
  // back here by Supabase with an error instead of a code. Show them the
  // suspension page rather than a vague "link didn't work".
  const authError = `${searchParams.get("error_code") ?? ""} ${searchParams.get("error_description") ?? ""}`;
  if (/banned/i.test(authError)) {
    redirect("/account-suspended");
  }

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error && /banned/i.test(`${error.code ?? ""} ${error.message}`)) {
      redirect("/account-suspended");
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (!ok) {
    redirect("/login?error=That sign-in link didn't work. Try logging in.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("needs_username, deleted_at, suspended_at")
      .eq("id", user.id)
      .maybeSingle();
    // Suspended before sign-in was blocked at the auth level (older
    // suspensions only set suspended_at). Don't leave them signed in.
    if (profile?.suspended_at) {
      await supabase.auth.signOut();
      redirect("/account-suspended");
    }
    // Same check the email and password login does: an account waiting to
    // be deleted goes to the page where it can be reactivated.
    if (profile?.deleted_at) {
      redirect("/account/deletion-pending");
    }
    if (profile?.needs_username) {
      redirect(`/welcome?next=${encodeURIComponent(next)}`);
    }
  }

  redirect(next);
}
