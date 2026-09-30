import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin only: show or hide a shop in the Shops directory. Hidden means
 * status "hidden": off the list, the map and its public page, but nothing
 * is deleted and it comes straight back when switched on.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: { storeId?: string; visible?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.storeId) return NextResponse.json({ error: "Which shop?" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("fish_stores")
    .update({ status: body.visible ? "published" : "hidden" })
    .eq("id", body.storeId)
    .select("slug, status")
    .maybeSingle();
  if (error) {
    const hint = /hidden|check|enum|invalid input/i.test(error.message) ? " Run step 56 in Supabase first." : "";
    return NextResponse.json({ error: error.message + hint }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  revalidatePath("/stores");
  // The homepage shop count and top cities.
  revalidatePath("/");
  if (data.slug) revalidatePath(`/stores/${data.slug}`);
  return NextResponse.json({ ok: true, visible: data.status === "published" });
}
