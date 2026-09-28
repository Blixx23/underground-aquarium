import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Must match the key /api/account/delete writes.
const DELETION_HIDDEN_TANKS_KEY = "ua_deletion_public_tanks";

/**
 * Cancels a pending account deletion. Clears the deletion dates and makes
 * public again the tanks that were public when the member asked to delete.
 * Classified ads were marked expired, so the member reposts the ones they
 * still want from My listings.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("deleted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.deleted_at) {
    // Nothing to cancel. Treat as success so a double click is harmless.
    return NextResponse.json({ ok: true, tanksRestored: 0, tanksTracked: true });
  }

  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({ deleted_at: null, deletion_scheduled_for: null })
    .eq("id", user.id);
  if (profErr) {
    return NextResponse.json(
      { error: "Couldn't cancel deletion. Please try again." },
      { status: 500 }
    );
  }

  // Read the saved list from the auth record itself (not the session copy,
  // which can be out of date).
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
  const saved = (authUser?.user?.app_metadata as Record<string, unknown> | undefined)?.[
    DELETION_HIDDEN_TANKS_KEY
  ];
  // Deletions requested before this list existed have no record at all, so
  // the page can tell the member to check their tanks by hand.
  const tanksTracked = Array.isArray(saved);
  const tankIds = tanksTracked
    ? (saved as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  if (tankIds.length > 0) {
    await supabaseAdmin
      .from("tanks")
      .update({ is_public: true })
      .eq("user_id", user.id)
      .in("id", tankIds);
  }
  if (tanksTracked) {
    // Setting the key to null removes it from app_metadata.
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { [DELETION_HIDDEN_TANKS_KEY]: null },
    });
  }

  return NextResponse.json({
    ok: true,
    tanksRestored: tankIds.length,
    tanksTracked,
  });
}
