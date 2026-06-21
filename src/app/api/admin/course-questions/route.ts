import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
    section_id?: string;
    fields?: {
      prompt?: string;
      options?: unknown;
      correct_index?: number;
      sort_order?: number;
    };
    orderedIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action;

  if (action === "create") {
    const section_id = body.section_id;
    if (!section_id) {
      return NextResponse.json({ error: "Missing lesson." }, { status: 400 });
    }
    const { data: maxRow } = await supabaseAdmin
      .from("course_questions")
      .select("sort_order")
      .eq("section_id", section_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_order = ((maxRow?.sort_order as number | undefined) ?? -1) + 1;
    const { data: inserted, error } = await supabaseAdmin
      .from("course_questions")
      .insert({
        section_id,
        prompt: "New question",
        options: ["First answer", "Second answer"],
        correct_index: 0,
        sort_order,
      })
      .select("id, prompt, options, correct_index, sort_order")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, question: inserted });
  }

  if (action === "update") {
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }
    const fields = body.fields ?? {};
    const update: Record<string, unknown> = {};

    if ("prompt" in fields) {
      const prompt = String(fields.prompt ?? "").trim();
      if (!prompt) {
        return NextResponse.json(
          { error: "The question can't be empty." },
          { status: 400 }
        );
      }
      update.prompt = prompt;
    }
    if ("options" in fields) {
      const options = fields.options;
      if (
        !Array.isArray(options) ||
        options.length < 2 ||
        options.some((o) => typeof o !== "string" || !o.trim())
      ) {
        return NextResponse.json(
          { error: "Add at least two answers, each with text." },
          { status: 400 }
        );
      }
      update.options = options.map((o) => String(o).trim());
    }
    if ("correct_index" in fields) {
      const ci = Number(fields.correct_index);
      if (!Number.isInteger(ci) || ci < 0) {
        return NextResponse.json(
          { error: "Mark a valid correct answer." },
          { status: 400 }
        );
      }
      update.correct_index = ci;
    }
    if ("sort_order" in fields) {
      update.sort_order = Number(fields.sort_order) || 0;
    }

    // Guard: correct_index must point at a real option
    const optsForCheck =
      "options" in update
        ? (update.options as string[])
        : null;
    if (
      optsForCheck &&
      "correct_index" in update &&
      (update.correct_index as number) >= optsForCheck.length
    ) {
      return NextResponse.json(
        { error: "The correct answer must be one of the listed answers." },
        { status: 400 }
      );
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("course_questions")
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
      .from("course_questions")
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
        .from("course_questions")
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
