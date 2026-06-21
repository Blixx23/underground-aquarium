import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  let body: {
    target_type?: string;
    target_id?: string | null;
    target_label?: string | null;
    target_url?: string | null;
    reason?: string;
    details?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const targetType = (body.target_type ?? "").trim();
  const reason = (body.reason ?? "").trim();
  if (!targetType || !reason) {
    return NextResponse.json(
      { error: "A target and reason are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to report." },
      { status: 401 }
    );
  }

  const targetId = body.target_id ? String(body.target_id).slice(0, 200) : null;
  const targetLabel = body.target_label
    ? String(body.target_label).slice(0, 300)
    : null;
  const targetUrl = body.target_url
    ? String(body.target_url).slice(0, 500)
    : null;
  const details = body.details ? String(body.details).slice(0, 2000) : null;

  // Don't let the same person pile up duplicate open reports on one thing.
  if (targetId) {
    const { data: existing } = await supabaseAdmin
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("status", "open")
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  const { error } = await supabaseAdmin.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType.slice(0, 50),
    target_id: targetId,
    target_label: targetLabel,
    target_url: targetUrl,
    reason: reason.slice(0, 100),
    details,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
