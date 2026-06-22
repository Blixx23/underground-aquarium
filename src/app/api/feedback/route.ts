import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  let body: { kind?: string; message?: string; page_url?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const kind = (body.kind ?? "").trim();
  const message = (body.message ?? "").trim();
  if (kind !== "bug" && kind !== "idea") {
    return NextResponse.json(
      { error: "Choose bug or idea." },
      { status: 400 }
    );
  }
  if (!message) {
    return NextResponse.json({ error: "Add a message." }, { status: 400 });
  }

  // Sign-in is optional — capture who sent it if we can, but accept anonymous
  // feedback too so testers never hit a wall.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pageUrl = body.page_url ? String(body.page_url).slice(0, 500) : null;

  const { error } = await supabaseAdmin.from("feedback").insert({
    user_id: user?.id ?? null,
    kind,
    message: message.slice(0, 4000),
    page_url: pageUrl,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
