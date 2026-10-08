import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * An invited member fills in the same details an applicant gives (name,
 * phone, mailing address and the rest) before paying. Saves them to their
 * own roster row only.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string).trim() : "");
  const clubId = str("clubId");
  const name = str("name");
  const phone = str("phone");
  const line1 = str("line1");
  const city = str("city");
  const state = str("state");
  const zip = str("zip");
  if (!clubId) return NextResponse.json({ error: "Missing club." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Please add a phone number so we can reach you." }, { status: 400 });
  if (!line1 || !city || !state || !zip) return NextResponse.json({ error: "Please add your full mailing address." }, { status: 400 });
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return NextResponse.json({ error: "Please enter a 5-digit ZIP code." }, { status: 400 });

  const { data: me } = await supabaseAdmin
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "You're not on this roster yet." }, { status: 404 });

  const details = {
    phone,
    address_line1: line1,
    address_line2: str("line2") || null,
    city,
    state,
    postal_code: zip,
    experience: str("experience") || null,
    interests: str("interests") || null,
    heard_about: str("heard") || null,
    note: str("note") || null,
  };
  const { data: existing } = await supabaseAdmin
    .from("club_member_details")
    .select("member_id")
    .eq("member_id", me.id)
    .maybeSingle();
  const { error } = existing
    ? await supabaseAdmin.from("club_member_details").update(details).eq("member_id", me.id)
    : await supabaseAdmin.from("club_member_details").insert({ member_id: me.id, ...details });
  if (error) return NextResponse.json({ error: "Couldn't save your details. Try again." }, { status: 500 });

  await supabaseAdmin.from("club_members").update({ display_name: name }).eq("id", me.id);
  return NextResponse.json({ ok: true });
}
