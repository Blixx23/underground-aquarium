import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bubbleTier } from "@/lib/bubbles";
import { sendEmail, bubbleAwardEmail, tierUpEmail } from "@/lib/email";

export async function POST(req: Request) {
  let body: { username?: string; delta?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = (body.username ?? "").trim().replace(/^@/, "");
  const delta = Math.trunc(Number(body.delta));
  const reason = (body.reason ?? "").trim();

  if (!username) {
    return NextResponse.json({ error: "A username is required." }, { status: 400 });
  }
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) {
    return NextResponse.json({ error: "Enter a non-zero amount." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json(
      { error: "A reason is required — it's recorded in the ledger." },
      { status: 400 }
    );
  }

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

  // Find the recipient, and capture their balance before the change.
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("id, username, bubble_balance")
    .ilike("username", username)
    .maybeSingle();
  if (!target) {
    return NextResponse.json(
      { error: `No member found with the username "${username}".` },
      { status: 404 }
    );
  }
  const beforeBalance = (target.bubble_balance as number) ?? 0;

  // Record the grant/deduction in the ledger. The trigger recomputes balance.
  const { error: insErr } = await supabaseAdmin.from("bubble_events").insert({
    user_id: target.id,
    delta,
    reason: reason.slice(0, 300),
    source: "manual",
    created_by: user.id,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Read back the recomputed balance.
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("bubble_balance")
    .eq("id", target.id)
    .maybeSingle();
  const afterBalance = (prof?.bubble_balance as number) ?? 0;

  const beforeTier = bubbleTier(beforeBalance);
  const afterTier = bubbleTier(afterBalance);
  const leveledUp = afterTier.min > beforeTier.min;

  // In-app notification for the award itself.
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: target.id,
      type: "bubbles",
      title: delta > 0 ? "You earned bubbles" : "Bubbles adjusted",
      body:
        delta > 0
          ? `You were awarded ${delta} bubble${delta === 1 ? "" : "s"}: ${reason}`
          : `${Math.abs(delta)} bubble${
              Math.abs(delta) === 1 ? "" : "s"
            } were removed: ${reason}`,
      link: target.username ? `/u/${target.username}` : null,
    });
    // And a separate tier-up note if this pushed them into a new tier.
    if (leveledUp) {
      await supabaseAdmin.from("notifications").insert({
        user_id: target.id,
        type: "bubbles",
        title: `New tier: ${afterTier.name}`,
        body: `Your bubbles carried you into ${afterTier.name}.`,
        link: target.username ? `/u/${target.username}` : null,
      });
    }
  } catch {
    // ignore
  }

  // Emails (best-effort). Look up the member's email via the admin API.
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
      target.id as string
    );
    const to = authUser?.user?.email ?? null;
    if (to) {
      const award = bubbleAwardEmail({
        amount: Math.abs(delta),
        granted: delta > 0,
        newBalance: afterBalance,
        reason,
        username: target.username as string | null,
      });
      await sendEmail({ to, subject: award.subject, html: award.html });

      if (leveledUp) {
        const t = tierUpEmail({
          tierName: afterTier.name,
          balance: afterBalance,
          username: target.username as string | null,
        });
        await sendEmail({ to, subject: t.subject, html: t.html });
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    ok: true,
    username: target.username,
    balance: afterBalance,
  });
}
