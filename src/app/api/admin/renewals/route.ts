import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RENEWAL_KINDS, addDays, addMonths, type Renewal } from "@/lib/admin/renewals";

export const dynamic = "force-dynamic";

/**
 * Admin only. The Renewals table on Admin > Dashboard > Renewals.
 *   save:    add a row (no id) or change one (id)
 *   renewed: push the expiry date forward by its renewal period
 *   delete:  remove a row
 */
type Body = {
  action?: "save" | "renewed" | "delete";
  id?: string;
  name?: string;
  kind?: string;
  provider?: string | null;
  account?: string | null;
  expires_on?: string | null;
  renew_months?: number | string | null;
  auto_renew?: boolean | "yes" | "no" | "" | null;
  cost?: number | string | null; // dollars
  remind_days?: number | string | null;
  link?: string | null;
  notes?: string | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const blank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const clean = (v: string | null | undefined) => (v ?? "").trim() || null;

function refresh() {
  revalidatePath("/admin/renewals");
  revalidatePath("/admin");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let b: Body;
  try {
    b = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const now = new Date().toISOString();

  if (b.action === "save") {
    const name = (b.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Give it a name." }, { status: 400 });
    if (name.length > 200) return NextResponse.json({ error: "Keep the name under 200 characters." }, { status: 400 });

    const expires = blank(b.expires_on) ? null : String(b.expires_on).trim();
    if (expires && !DATE.test(expires)) return NextResponse.json({ error: "That expiry date isn't valid." }, { status: 400 });

    const months = blank(b.renew_months) ? null : Number(b.renew_months);
    if (months !== null && (!Number.isInteger(months) || months < 1 || months > 120)) {
      return NextResponse.json({ error: "Renews every 1 to 120 months, or leave it blank." }, { status: 400 });
    }
    const remind = blank(b.remind_days) ? 30 : Number(b.remind_days);
    if (!Number.isInteger(remind) || remind < 0 || remind > 365) {
      return NextResponse.json({ error: "Warn 0 to 365 days ahead." }, { status: 400 });
    }
    const dollars = blank(b.cost) ? null : Number(String(b.cost).replace(/[$,\s]/g, ""));
    if (dollars !== null && (!Number.isFinite(dollars) || dollars < 0)) {
      return NextResponse.json({ error: "Cost should be a dollar amount." }, { status: 400 });
    }
    const link = clean(b.link);
    if (link && !/^https?:\/\//i.test(link)) {
      return NextResponse.json({ error: "Links need to start with https://" }, { status: 400 });
    }
    const auto =
      b.auto_renew === true || b.auto_renew === "yes" ? true : b.auto_renew === false || b.auto_renew === "no" ? false : null;

    const row = {
      name,
      kind: RENEWAL_KINDS.some((k) => k.key === b.kind) ? b.kind! : "other",
      provider: clean(b.provider),
      account: clean(b.account),
      expires_on: expires,
      renew_months: months,
      auto_renew: auto,
      cost_cents: dollars === null ? null : Math.round(dollars * 100),
      remind_days: remind,
      remind_on: expires ? addDays(expires, -remind) : null,
      link,
      notes: clean(b.notes),
      updated_at: now,
    };
    const { error } = b.id
      ? await supabaseAdmin.from("renewals").update(row).eq("id", b.id)
      : await supabaseAdmin.from("renewals").insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    refresh();
    return NextResponse.json({ ok: true });
  }

  if (!b.id) return NextResponse.json({ error: "Which one?" }, { status: 400 });

  if (b.action === "delete") {
    const { error } = await supabaseAdmin.from("renewals").delete().eq("id", b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    refresh();
    return NextResponse.json({ ok: true });
  }

  if (b.action === "renewed") {
    const { data } = await supabaseAdmin.from("renewals").select("*").eq("id", b.id).maybeSingle();
    const r = data as Renewal | null;
    if (!r) return NextResponse.json({ error: "That row is gone." }, { status: 404 });
    if (!r.expires_on || !r.renew_months) {
      return NextResponse.json({ error: "Add an expiry date and how often it renews first (Edit)." }, { status: 400 });
    }
    const next = addMonths(r.expires_on, r.renew_months);
    const { error } = await supabaseAdmin
      .from("renewals")
      .update({ expires_on: next, remind_on: addDays(next, -r.remind_days), updated_at: now })
      .eq("id", r.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    refresh();
    return NextResponse.json({ ok: true, expires_on: next });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
