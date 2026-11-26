import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Water test reminders: GET reads the member's choice, POST sets it (7, 14, or null for off). */
async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await me();
  if (!user) return NextResponse.json({ days: null, signedIn: false });
  const { data } = await supabaseAdmin.from("profiles").select("water_reminder_days").eq("id", user.id).maybeSingle();
  return NextResponse.json({ days: (data as { water_reminder_days?: number | null } | null)?.water_reminder_days ?? null, signedIn: true });
}

export async function POST(request: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { days } = (await request.json().catch(() => ({}))) as { days?: number | null };
  const value = days === 7 || days === 14 ? days : null;
  const { error } = await supabaseAdmin
    .from("profiles")
    // Start the clock now, so the first reminder comes one interval from today.
    .update({ water_reminder_days: value, water_reminder_last_at: value ? new Date().toISOString() : null })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Turning reminders on also un-mutes them in the bell, in case they were switched off there.
  if (value) {
    const { data } = await supabaseAdmin.from("profiles").select("muted_notifications").eq("id", user.id).maybeSingle();
    const muted = ((data as { muted_notifications?: string[] | null } | null)?.muted_notifications ?? []).filter((t) => t !== "water_reminder");
    await supabaseAdmin.from("profiles").update({ muted_notifications: muted }).eq("id", user.id);
  }
  return NextResponse.json({ ok: true, days: value });
}
