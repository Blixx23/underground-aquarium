import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadLibrary } from "@/lib/species/library";
import { reviewSpeciesRequest } from "@/lib/species/aiReview";
import type { AiReview } from "@/lib/species/fields";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Admin only. The AI check for one species request: { id, force? }.
 * A saved check is returned as is unless force is set (Re-check). Saving
 * needs step70 SQL; without it the check still works, it just isn't kept.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: { id?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Which request?" }, { status: 400 });

  const { data: row } = await supabaseAdmin.from("species_suggestions").select("*").eq("id", body.id).maybeSingle();
  const r = row as { common_name?: string; scientific_name?: string | null; note?: string | null; ai_review?: AiReview | null } | null;
  if (!r?.common_name) return NextResponse.json({ error: "That request is gone." }, { status: 404 });
  if (r.ai_review && !body.force) return NextResponse.json({ ok: true, review: r.ai_review, saved: true });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "The AI isn't set up (ANTHROPIC_API_KEY missing in Vercel)." }, { status: 503 });
  }

  try {
    const library = await loadLibrary();
    if (library.length === 0) return NextResponse.json({ error: "Couldn't load the species library." }, { status: 500 });
    const review = await reviewSpeciesRequest(
      { common_name: r.common_name, scientific_name: r.scientific_name ?? null, note: r.note ?? null },
      library
    );
    const { error } = await supabaseAdmin
      .from("species_suggestions")
      .update({ ai_review: review, ai_reviewed_at: review.checked_at })
      .eq("id", body.id);
    return NextResponse.json({ ok: true, review, saved: !error });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "The AI check failed." }, { status: 502 });
  }
}
