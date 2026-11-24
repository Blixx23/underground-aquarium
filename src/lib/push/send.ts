import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apnsConfigured, sendApns, type ApnsEnv } from "@/lib/push/apns";
import { fcmConfigured, sendFcm } from "@/lib/push/fcm";

/**
 * Turns bell notifications into iPhone push notifications.
 *
 * Every new row in `notifications` pings /api/push/send right away (a
 * database trigger, see supabase/migrations/0087_push_devices.sql), and a
 * one-minute cron sweeps up anything the ping missed. Each notification is
 * claimed by setting pushed_at first, so it's never pushed twice however
 * many times it's asked for. Only notifications from the last 15 minutes are
 * pushed, so nothing old ever shows up on a phone.
 *
 * People already choose what lands in their bell (muted kinds never make a
 * row), so push follows the bell, minus the kinds too frequent or minor to
 * buzz a phone for.
 */

const NOT_WORTH_A_BUZZ = new Set([
  "bubbles",
  "feed_comment_like",
  "weekly_local",
  "shop_weekly",
  "shop_milestone",
  "site",
]);

type Row = {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  body: string | null;
  link: string | null;
};

const RECENT_MINUTES = 15;

function trim(text: string | null, max: number): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

async function pushRow(row: Row): Promise<number> {
  if (NOT_WORTH_A_BUZZ.has(row.type ?? "")) return 0;

  const { data: devices } = await supabaseAdmin
    .from("push_devices")
    .select("id, token, apns_env, platform")
    .eq("user_id", row.user_id);
  if (!devices?.length) return 0;

  let sent = 0;
  for (const d of devices as { id: string; token: string; apns_env: ApnsEnv | null; platform: string | null }[]) {
    if (d.platform === "android") {
      if (!fcmConfigured()) continue;
      const r = await sendFcm(d.token, {
        title: trim(row.title, 120) ?? "Underground Aquarium",
        body: trim(row.body, 240),
        link: row.link,
        group: row.type ?? "general",
      });
      if (r.ok) sent++;
      else if ("gone" in r) await supabaseAdmin.from("push_devices").delete().eq("id", d.id);
      else console.error("[push] android send failed", r.reason);
      continue;
    }
    if (!apnsConfigured()) continue;
    const { result, env } = await sendApns(
      d.token,
      {
        title: trim(row.title, 120) ?? "Underground Aquarium",
        body: trim(row.body, 240),
        link: row.link,
        threadId: row.type ?? "general",
      },
      d.apns_env
    );
    if (result.ok) {
      sent++;
      if (env !== d.apns_env) {
        await supabaseAdmin.from("push_devices").update({ apns_env: env }).eq("id", d.id);
      }
    } else if ("gone" in result) {
      await supabaseAdmin.from("push_devices").delete().eq("id", d.id);
    } else {
      console.error("[push] send failed", result.reason);
    }
  }
  return sent;
}

/** Push one notification, if it's new and nobody has pushed it yet. */
export async function pushNotificationById(id: string): Promise<number> {
  if (!apnsConfigured() && !fcmConfigured()) return 0;
  const since = new Date(Date.now() - RECENT_MINUTES * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", id)
    .is("pushed_at", null)
    .gte("created_at", since)
    .select("id, user_id, type, title, body, link")
    .maybeSingle();
  if (!data) return 0;
  return pushRow(data as Row);
}

/** The cron's sweep: anything recent the instant ping missed. */
export async function pushPending(limit = 100): Promise<{ claimed: number; sent: number }> {
  if (!apnsConfigured() && !fcmConfigured()) return { claimed: 0, sent: 0 };
  const since = new Date(Date.now() - RECENT_MINUTES * 60_000).toISOString();
  // Only people with the app installed, so the sweep stays small.
  const { data: owners } = await supabaseAdmin.from("push_devices").select("user_id");
  const userIds = Array.from(new Set((owners ?? []).map((o: { user_id: string }) => o.user_id)));
  if (!userIds.length) return { claimed: 0, sent: 0 };

  const { data: pending } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .is("pushed_at", null)
    .gte("created_at", since)
    .in("user_id", userIds)
    .order("created_at", { ascending: true })
    .limit(limit);

  let claimed = 0;
  let sent = 0;
  for (const p of (pending ?? []) as { id: string }[]) {
    const n = await pushNotificationById(p.id);
    claimed++;
    sent += n;
  }
  return { claimed, sent };
}
