import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardBubbles } from "@/lib/awardBubbles";

/**
 * Admin decision on a species request. The database does the work (creates
 * the entry or adds the name, notifies the requester, updates trophies);
 * this hands out the bubbles, which also handles tier-ups.
 */
export async function POST(req: Request) {
  let body: {
    id?: string;
    action?: string;
    species?: Record<string, unknown> | null;
    existingSlug?: string | null;
    note?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || !["create", "alias", "dismiss"].includes(action ?? "")) {
    return NextResponse.json({ error: "Missing request or action." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // resolve_species_request checks the caller is an admin.
  const { data, error } = await supabase.rpc("resolve_species_request", {
    p_id: id,
    p_action: action,
    p_species: body.species ?? null,
    p_existing_slug: body.existingSlug ?? null,
    p_note: body.note ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const result = (data ?? {}) as { slug?: string | null; suggester_id?: string | null; status?: string };
  if (result.status === "added" && result.suggester_id) {
    await awardBubbles(result.suggester_id, "species_approved", `species_sugg_${id}`);
  }

  return NextResponse.json({ ok: true, slug: result.slug ?? null });
}
