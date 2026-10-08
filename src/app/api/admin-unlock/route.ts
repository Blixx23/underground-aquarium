import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE, makeUnlockToken, passwordMatches } from "@/lib/admin/unlock";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Checks the admin password and unlocks the admin area for this browser. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const typed = typeof body.password === "string" ? body.password : "";
  if (!typed || !(await passwordMatches(typed))) {
    // A pause on every miss makes guessing slow.
    await sleep(1500);
    console.warn(`[admin-unlock] wrong admin password for ${user.id}`);
    return NextResponse.json({ error: "That password isn't right." }, { status: 401 });
  }

  const { value, maxAge } = await makeUnlockToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, value, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge });
  return res;
}

/** Locks the admin area again on this browser. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
