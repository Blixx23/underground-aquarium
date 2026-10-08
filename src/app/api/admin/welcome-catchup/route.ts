import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { welcomeExistingMembers } from "@/lib/email/welcome";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One-time: sends the welcome email to members who joined before it existed.
 * Admins only. Open it signed in to see the count; add ?send=yes to queue
 * them. Running it twice sends nothing new. Delete this route once used.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const send = new URL(req.url).searchParams.get("send") === "yes";
  try {
    const result = await welcomeExistingMembers({ dry: !send });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 500 });
  }
}
