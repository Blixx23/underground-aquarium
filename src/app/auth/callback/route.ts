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

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
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
      .select("needs_username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.needs_username) {
      redirect(`/welcome?next=${encodeURIComponent(next)}`);
    }
  }

  redirect(next);
}
