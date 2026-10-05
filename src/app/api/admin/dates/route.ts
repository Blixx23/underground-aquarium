import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { KEY_DATE_CATEGORIES, addDays, addMonths, type KeyDate } from "@/lib/admin/keyDates";

export const dynamic = "force-dynamic";

/**
 * Admin only. Key dates on Admin > Dashboard > Key dates.
 *   save:   add a date (no id) or change one (id)
 *   done:   one-off dates are closed; repeating ones roll forward to the next due date
 *   reopen: put a closed date back on the list
 *   delete: remove it for good
 */
type Body = {
  action?: "save" | "done" | "reopen" | "delete";
  id?: string;
  title?: string;
  due_on?: string;
  category?: string;
  notes?: string | null;
  link?: string | null;
  repeat_months?: number | string | null;
  remind_days?: number | string | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/admin/dates");
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
    const title = (b.title ?? "").trim();
    const due = (b.due_on ?? "").trim();
    if (!title) return NextResponse.json({ error: "Give it a name." }, { status: 400 });
    if (title.length > 200) return NextResponse.json({ error: "Keep the name under 200 characters." }, { status: 400 });
    if (!DATE.test(due)) return NextResponse.json({ error: "Pick a due date." }, { status: 400 });
    const repeat = b.repeat_months === null || b.repeat_months === "" || b.repeat_months === undefined ? null : Number(b.repeat_months);
    if (repeat !== null && (!Number.isInteger(repeat) || repeat < 1 || repeat > 120)) {
      return NextResponse.json({ error: "Repeat every 1 to 120 months, or leave it blank." }, { status: 400 });
    }
    const remind = b.remind_days === null || b.remind_days === "" || b.remind_days === undefined ? 30 : Number(b.remind_days);
    if (!Number.isInteger(remind) || remind < 0 || remind > 365) {
      return NextResponse.json({ error: "Remind 0 to 365 days ahead." }, { status: 400 });
    }
    const link = (b.link ?? "").trim();
    if (link && !/^https?:\/\//i.test(link)) {
      return NextResponse.json({ error: "Links need to start with https://" }, { status: 400 });
    }
    const category = KEY_DATE_CATEGORIES.some((c) => c.key === b.category) ? b.category! : "other";
    const row = {
      title,
      due_on: due,
      category,
      notes: (b.notes ?? "").trim() || null,
      link: link || null,
      repeat_months: repeat,
      remind_days: remind,
      remind_on: addDays(due, -remind),
      updated_at: now,
    };
    const { error } = b.id
      ? await supabaseAdmin.from("important_dates").update(row).eq("id", b.id)
      : await supabaseAdmin.from("important_dates").insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    refresh();
    return NextResponse.json({ ok: true });
  }

  if (!b.id) return NextResponse.json({ error: "Which date?" }, { status: 400 });

  if (b.action === "delete") {
    const { error } = await supabaseAdmin.from("important_dates").delete().eq("id", b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    refresh();
    return NextResponse.json({ ok: true });
  }

  const { data } = await supabaseAdmin.from("important_dates").select("*").eq("id", b.id).maybeSingle();
  const d = data as KeyDate | null;
  if (!d) return NextResponse.json({ error: "That date is gone." }, { status: 404 });

  if (b.action === "done") {
    // A renewal that comes around again moves to its next due date instead of closing.
    const next = d.repeat_months ? addMonths(d.due_on, d.repeat_months) : null;
    const patch = next
      ? { due_on: next, remind_on: addDays(next, -d.remind_days), last_done_at: now, updated_at: now }
      : { done_at: now, last_done_at: now, updated_at: now };
    const { error } = await supabaseAdmin.from("important_dates").update(patch).eq("id", d.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    refresh();
    return NextResponse.json({ ok: true, rolledTo: next });
  }

  if (b.action === "reopen") {
    const { error } = await supabaseAdmin.from("important_dates").update({ done_at: null, updated_at: now }).eq("id", d.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    refresh();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
