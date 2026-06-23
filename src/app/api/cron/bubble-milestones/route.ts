import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";

// Runs once a day. Grants the yearly, time-based bubble awards to anyone whose
// account anniversary falls today. Every grant is deduped per calendar year, so
// re-running the job (or a retry) never pays out twice.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const today = `${mm}-${dd}`;
  const year = now.getUTCFullYear();

  // No suspension/moderation system exists yet, so every member reaching their
  // anniversary is, by definition, in good standing. When a suspension field is
  // added later, gate this on it.
  function inGoodStanding(): boolean {
    return true;
  }

  let page = 1;
  const perPage = 200;
  let granted = 0;

  // Safety cap so a misbehaving page count can't loop forever.
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data?.users?.length) break;

    for (const u of data.users) {
      if (!u.created_at) continue;
      const created = new Date(u.created_at);
      const cmm = String(created.getUTCMonth() + 1).padStart(2, "0");
      const cdd = String(created.getUTCDate()).padStart(2, "0");
      if (`${cmm}-${cdd}` !== today) continue;
      if (year - created.getUTCFullYear() < 1) continue; // not a full year yet

      const a = await awardBubbles(u.id, "account_anniversary", `anniv_${year}`);
      if (a > 0) granted++;

      if (inGoodStanding()) {
        const g = await awardBubbles(
          u.id,
          "year_good_standing",
          `standing_${year}`
        );
        if (g > 0) granted++;
      }
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return NextResponse.json({ ok: true, granted });
}
