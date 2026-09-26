import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";

/**
 * Admin decision on a member's species photo. The database checks the
 * caller is an admin, applies the 5-photo limit, notifies the member
 * and updates trophies. This hands out the bubbles, clears a rejected
 * file from storage and refreshes the species page.
 */
export async function POST(req: Request) {
  let body: {
    id?: string;
    action?: string;
    cover?: boolean;
    retireId?: string | null;
    note?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || !["approve", "reject"].includes(action ?? "")) {
    return NextResponse.json({ error: "Missing photo or action." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase.rpc("review_species_photo", {
    p_id: id,
    p_action: action,
    p_cover: !!body.cover,
    p_retire: body.retireId ?? null,
    p_note: body.note ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const result = (data ?? {}) as {
    status?: string;
    user_id?: string | null;
    slug?: string | null;
    storage_path?: string | null;
  };

  let bubbles = 0;
  if (result.status === "approved" && result.user_id) {
    bubbles = await awardBubbles(result.user_id, "species_photo_used", `species_photo_${id}`);
  }

  if (result.status === "rejected" && result.storage_path) {
    try {
      await supabaseAdmin.storage.from("species-photos").remove([result.storage_path]);
    } catch {
      // The row is already marked rejected; a leftover file does no harm.
    }
  }

  if (result.slug) revalidatePath(`/species/${result.slug}`);

  return NextResponse.json({ ok: true, bubbles });
}
