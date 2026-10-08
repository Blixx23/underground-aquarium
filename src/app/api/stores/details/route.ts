import { NextResponse } from "next/server";
import { adminUnlocked, LOCKED_MESSAGE } from "@/lib/admin/unlockCheck";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = ["address", "city", "state", "phone", "website", "hours", "description"] as const;
const MAX: Record<(typeof TEXT_FIELDS)[number], number> = {
  address: 200,
  city: 100,
  state: 40,
  phone: 40,
  website: 300,
  hours: 1000,
  description: 3000,
};

/**
 * Save a shop's details (address, phone, website, hours, about, tags).
 * The shop's owner or a site admin only. Saved with the service client after
 * that check, so an admin fixing someone else's shop never fails silently.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const storeId = typeof body?.storeId === "string" ? body.storeId : null;
    if (!storeId) return NextResponse.json({ error: "Something was missing. Please try again." }, { status: 400 });

    const { data: store } = await supabaseAdmin
      .from("fish_stores")
      .select("id, claimed_by")
      .eq("id", storeId)
      .maybeSingle();
    if (!store) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    if (store.claimed_by !== user.id) {
      const { data: me } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!me?.is_admin) return NextResponse.json({ error: "Only the shop's owner can change this." }, { status: 403 });
      if (!(await adminUnlocked(user.id))) return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 403 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const f of TEXT_FIELDS) {
      const v = body?.[f];
      if (v === undefined) continue;
      const text = typeof v === "string" ? v.trim().slice(0, MAX[f]) : "";
      update[f] = text || null;
    }
    if (Array.isArray(body?.tags)) {
      update.tags = (body.tags as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12);
    }

    const { error } = await supabaseAdmin.from("fish_stores").update(update).eq("id", storeId);
    if (error) {
      return NextResponse.json(
        { error: "Couldn't save your changes. If this keeps happening, email support@undergroundaquarium.com." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't save your changes. Please try again." }, { status: 500 });
  }
}
