import { tokenizeOwnNumbers, type TokenRow } from "@/lib/data/tokens";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { awardBubbles } from "@/lib/awardBubbles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { thankForSubmission } from "@/lib/species/thankYou";

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
    /** Turn-downs: give the thank-you bubbles (off for spam). */
    thanks?: boolean;
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

  const note = (body.note ?? "").trim();
  if (action === "dismiss" && !note) {
    return NextResponse.json({ error: "Give a short reason. The member sees it." }, { status: 400 });
  }

  // Who asked, read before the decision in case the result leaves it out.
  let suggester: string | null = null;
  if (action === "dismiss") {
    const { data: row } = await supabaseAdmin.from("species_suggestions").select("*").eq("id", id).maybeSingle();
    const r = (row ?? {}) as Record<string, unknown>;
    suggester = ((r.suggester_id ?? r.user_id ?? null) as string | null) ?? null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Numbers the AI or admin typed into the text become live placeholders, so the
  // text follows the numbers if they're corrected later.
  if (action === "create" && body.species && typeof body.species === "object") {
    const sp = body.species as Record<string, unknown>;
    for (const k of ["summary", "body"]) {
      if (typeof sp[k] === "string") sp[k] = tokenizeOwnNumbers(sp[k] as string, sp as unknown as TokenRow);
    }
  }

  // resolve_species_request checks the caller is an admin.
  const { data, error } = await supabase.rpc("resolve_species_request", {
    p_id: id,
    p_action: action,
    p_species: body.species ?? null,
    p_existing_slug: body.existingSlug ?? null,
    p_note: note || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const result = (data ?? {}) as { slug?: string | null; suggester_id?: string | null; status?: string };
  if (result.status === "added" && result.suggester_id) {
    await awardBubbles(result.suggester_id, "species_approved", `species_sugg_${id}`);
  }
  let bubbles = 0;
  if (action === "dismiss") {
    bubbles = await thankForSubmission({
      userId: result.suggester_id ?? suggester,
      kind: "request",
      id,
      reason: note,
      giveBubbles: body.thanks !== false,
    });
  }

  // Show the change straight away instead of waiting out the hour-long
  // page cache: the list, the fish's own page (which may have been cached
  // as "not found" before it existed) and the Tank Builder.
  revalidatePath("/species");
  revalidatePath("/tank-builder");
  if (result.slug) revalidatePath(`/species/${result.slug}`);

  return NextResponse.json({ ok: true, slug: result.slug ?? null, bubbles });
}
