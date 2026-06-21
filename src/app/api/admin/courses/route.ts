import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_FIELDS = [
  "title",
  "slug",
  "subtitle",
  "description",
  "est_minutes",
  "badge_title",
  "cover_image",
  "is_published",
  "sort_order",
];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  let body: {
    action?: string;
    id?: string;
    title?: string;
    slug?: string;
    badge_title?: string;
    fields?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action;

  if (action === "create") {
    const title = (body.title ?? "").trim();
    const slug = (body.slug ?? "").trim().toLowerCase();
    const badge_title = (body.badge_title ?? "").trim() || "Certified";
    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required." },
        { status: 400 }
      );
    }
    const { data: existing } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "That slug is already taken." },
        { status: 409 }
      );
    }
    const { data: maxRow } = await supabaseAdmin
      .from("courses")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_order = ((maxRow?.sort_order as number | undefined) ?? -1) + 1;
    const { data: inserted, error } = await supabaseAdmin
      .from("courses")
      .insert({ title, slug, badge_title, is_published: false, sort_order })
      .select("id")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: inserted?.id });
  }

  if (action === "update") {
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }
    const fields = body.fields ?? {};
    const update: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in fields) update[key] = fields[key];
    }
    if ("slug" in update) {
      const newSlug = String(update.slug).trim().toLowerCase();
      if (!newSlug) {
        return NextResponse.json(
          { error: "Slug can't be empty." },
          { status: 400 }
        );
      }
      const { data: clash } = await supabaseAdmin
        .from("courses")
        .select("id")
        .eq("slug", newSlug)
        .neq("id", id)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          { error: "That slug is already taken." },
          { status: 409 }
        );
      }
      update.slug = newSlug;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("courses")
      .update(update)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
