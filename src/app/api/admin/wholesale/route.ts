import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stopShopOutreach } from "@/lib/email/stopShopOutreach";

export const dynamic = "force-dynamic";

const STAGES = ["prospect", "contacted", "signed", "not_interested"] as const;

type Body = {
  storeId?: string;
  action?: "move" | "return" | "update";
  stage?: string;
  notes?: string;
};

function refreshPublic(slug: string | null) {
  revalidatePath("/stores");
  revalidatePath("/");
  if (slug) revalidatePath(`/stores/${slug}`);
}

/**
 * Admin only. The Wholesale list:
 *  - move:   off the shop directory and onto the Wholesale list, and every
 *            shop email to them stops now. No email is sent to them.
 *  - return: back to the shop directory as a live shop.
 *  - update: stage and notes while you build the list.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.storeId) return NextResponse.json({ error: "Which business?" }, { status: 400 });

  const { data: shop } = await supabaseAdmin
    .from("fish_stores")
    .select("id, slug, status, wholesale_stage")
    .eq("id", body.storeId)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const s = shop as { id: string; slug: string | null; status: string | null; wholesale_stage: string | null };

  if (body.action === "move") {
    const { error } = await supabaseAdmin
      .from("fish_stores")
      .update({
        status: "wholesale",
        wholesale_at: new Date().toISOString(),
        wholesale_stage: s.wholesale_stage ?? "prospect",
      })
      .eq("id", s.id);
    if (error) {
      const hint = /wholesale|check|enum|invalid input|column/i.test(error.message) ? " Run step 67 in Supabase first." : "";
      return NextResponse.json({ error: error.message + hint }, { status: 500 });
    }
    const out = await stopShopOutreach([s.id], "Moved to the wholesale list");
    refreshPublic(s.slug);
    revalidatePath("/admin/shops");
    revalidatePath("/admin/wholesale");
    return NextResponse.json({ ok: true, ...out });
  }

  if (body.action === "return") {
    if (s.status !== "wholesale") return NextResponse.json({ error: "That one isn't on the wholesale list." }, { status: 400 });
    const { error } = await supabaseAdmin
      .from("fish_stores")
      .update({ status: "published", wholesale_at: null })
      .eq("id", s.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    refreshPublic(s.slug);
    revalidatePath("/admin/shops");
    revalidatePath("/admin/wholesale");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update") {
    const patch: Record<string, string | null> = {};
    if (body.stage !== undefined) {
      if (!STAGES.includes(body.stage as (typeof STAGES)[number])) {
        return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
      }
      patch.wholesale_stage = body.stage;
    }
    if (body.notes !== undefined) patch.wholesale_notes = body.notes.slice(0, 4000).trim() || null;
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });
    const { error } = await supabaseAdmin.from("fish_stores").update(patch).eq("id", s.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/admin/wholesale");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
