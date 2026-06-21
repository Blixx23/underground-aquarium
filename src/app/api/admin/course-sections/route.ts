import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_FIELDS = ["title", "content", "video_url", "has_video", "sort_order"];

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
    course_id?: string;
    title?: string;
    fields?: Record<string, unknown>;
    orderedIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action;

  if (action === "create") {
    const course_id = body.course_id;
    if (!course_id) {
      return NextResponse.json({ error: "Missing course." }, { status: 400 });
    }
    const { data: maxRow } = await supabaseAdmin
      .from("course_sections")
      .select("sort_order")
      .eq("course_id", course_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_order = ((maxRow?.sort_order as number | undefined) ?? -1) + 1;
    const { data: inserted, error } = await supabaseAdmin
      .from("course_sections")
      .insert({
        course_id,
        title: (body.title ?? "New lesson").trim() || "New lesson",
        content: "",
        has_video: false,
        sort_order,
      })
      .select("id, title, content, has_video, video_url, sort_order")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, section: inserted });
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
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("course_sections")
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
    const { error } = await supabaseAdmin
      .from("course_sections")
      .delete()
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "reorder") {
    const ids = body.orderedIds;
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "Missing order." }, { status: 400 });
    }
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabaseAdmin
        .from("course_sections")
        .update({ sort_order: i })
        .eq("id", ids[i]);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
