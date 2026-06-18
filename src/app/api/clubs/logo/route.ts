import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const clubId = form.get("clubId");
  if (!(file instanceof File) || typeof clubId !== "string") {
    return NextResponse.json({ error: "Missing file or club." }, { status: 400 });
  }

  // Only the club owner or an admin may change the logo.
  const { data: me } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${user.id}/club-${clubId}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from("product-images")
    .upload(path, bytes, {
      contentType: file.type || "image/png",
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
