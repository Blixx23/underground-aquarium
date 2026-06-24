import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bubbleTier } from "@/lib/bubbles";
import { sendEmail, tierUpEmail } from "@/lib/email";

export async function POST(req: Request) {
  let body: { tank_id?: string; value?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const tankId = body.tank_id;
  const value = body.value;
  if (!tankId || (value !== -1 && value !== 0 && value !== 1)) {
    return NextResponse.json({ error: "Bad vote." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  }

  // Look up the tank's owner so we can detect a tier-up afterwards.
  const { data: tank } = await supabase
    .from("tanks")
    .select("id, user_id")
    .eq("id", tankId)
    .maybeSingle();
  if (!tank) {
    return NextResponse.json({ error: "Tank not found." }, { status: 404 });
  }
  const ownerId = (tank.user_id as string | null) ?? null;

  // Owner's balance before the vote (skip the lookup for self-votes).
  let beforeBalance = 0;
  const checkTier = Boolean(ownerId) && ownerId !== user.id;
  if (checkTier) {
    const { data: a } = await supabaseAdmin
      .from("profiles")
      .select("bubble_balance")
      .eq("id", ownerId as string)
      .maybeSingle();
    beforeBalance = (a?.bubble_balance as number) ?? 0;
  }

  // Apply the vote. value 0 clears it; otherwise upsert. RLS keeps users to
  // their own rows; the score trigger updates the cached score and balance.
  if (value === 0) {
    const { error } = await supabase
      .from("tank_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("tank_id", tankId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("tank_votes")
      .upsert(
        { user_id: user.id, tank_id: tankId, value },
        { onConflict: "user_id,tank_id" }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: tankAfter } = await supabase
    .from("tanks")
    .select("score")
    .eq("id", tankId)
    .maybeSingle();
  const score = tankAfter?.score ?? 0;

  // Tier-up? Notify + email the owner (never on a self-vote).
  if (checkTier) {
    const { data: a2 } = await supabaseAdmin
      .from("profiles")
      .select("bubble_balance, username")
      .eq("id", ownerId as string)
      .maybeSingle();
    const afterBalance = (a2?.bubble_balance as number) ?? 0;
    const afterTier = bubbleTier(afterBalance);
    if (afterTier.rank > bubbleTier(beforeBalance).rank) {
      // Atomically claim the new tier so simultaneous or repeated votes can't
      // each fire the same alert — only the first to raise the tier notifies.
      const { data: claimed } = await supabaseAdmin.rpc("claim_bubble_tier", {
        p_user_id: ownerId,
        p_rank: afterTier.rank,
      });
      if (!claimed) return NextResponse.json({ ok: true, score, value });
      const tier = afterTier;
      const uname = (a2?.username as string | null) ?? null;
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: ownerId,
          type: "bubbles",
          title: `New tier: ${tier.name}`,
          body: `Your bubbles carried you into ${tier.name}. Keep it up!`,
          link: uname ? `/u/${uname}` : null,
        });
      } catch {
        // ignore
      }
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
          ownerId as string
        );
        const to = authUser?.user?.email ?? null;
        if (to) {
          const t = tierUpEmail({
            tierName: tier.name,
            balance: afterBalance,
            username: uname,
          });
          await sendEmail({ to, subject: t.subject, html: t.html });
        }
      } catch {
        // ignore
      }
    }
  }

  return NextResponse.json({ ok: true, score, value });
}
