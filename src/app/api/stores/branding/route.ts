import { NextResponse } from "next/server";
import { adminUnlocked, LOCKED_MESSAGE } from "@/lib/admin/unlockCheck";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Save or clear a shop's banner (cover_url) or logo (logo_url).
 * Only the shop's owner, or a site admin, can do this. The photo must
 * already be in our own storage, so nobody can point a shop page at an
 * outside image.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as
      | { storeId?: unknown; kind?: unknown; url?: unknown }
      | null;
    const storeId = typeof body?.storeId === "string" ? body.storeId : null;
    const kind = body?.kind === "cover" || body?.kind === "logo" ? body.kind : null;
    const url = body?.url === null ? null : typeof body?.url === "string" ? body.url : undefined;
    if (!storeId || !kind || url === undefined) {
      return NextResponse.json({ error: "Something was missing. Please try again." }, { status: 400 });
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
    const ownStorage = `${supabaseUrl}/storage/v1/object/public/store-photos/`;
    if (url !== null && !url.startsWith(ownStorage)) {
      return NextResponse.json({ error: "That photo has to be uploaded here first." }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from("fish_stores")
      .select("id, claimed_by")
      .eq("id", storeId)
      .maybeSingle();
    if (!store) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

    if (store.claimed_by !== user.id) {
      const { data: me } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!me?.is_admin) {
        return NextResponse.json({ error: "Only the shop's owner can change this." }, { status: 403 });
      }
      if (!(await adminUnlocked(user.id))) return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 403 });
    }

    const column = kind === "cover" ? "cover_url" : "logo_url";
    const { error } = await supabaseAdmin
      .from("fish_stores")
      .update({ [column]: url })
      .eq("id", storeId);
    if (error) {
      return NextResponse.json(
        { error: "Couldn't save that. If this keeps happening, email support@undergroundaquarium.com." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't save that. Please try again." }, { status: 500 });
  }
}
