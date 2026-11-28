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

/**
 * The number for the app icon: unread notifications plus message threads with
 * something new. Sent with every push so the icon is right even with the app closed.
 */
export async function badgeCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const [{ count }, { data: threads }] = await Promise.all([
    supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .gte("created_at", since),
    supabaseAdmin
      .from("listing_threads")
      .select("buyer_id, seller_id, last_message_at, buyer_last_read_at, seller_last_read_at")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .gte("last_message_at", since)
      .limit(200),
  ]);
  const unreadThreads = ((threads ?? []) as {
    buyer_id: string;
    last_message_at: string;
    buyer_last_read_at: string | null;
    seller_last_read_at: string | null;
  }[]).filter((t) => {
    const readAt = t.buyer_id === userId ? t.buyer_last_read_at : t.seller_last_read_at;
    return !readAt || readAt < t.last_message_at;
  }).length;
  return Math.min(99, (count ?? 0) + unreadThreads);
}

async function pushRow(row: Row): Promise<number> {
  if (NOT_WORTH_A_BUZZ.has(row.type ?? "")) return 0;

  // "*" so this keeps working whichever optional columns exist.
  const { data: devices } = await supabaseAdmin
    .from("push_devices")
    .select("*")
    .eq("user_id", row.user_id);
  if (!devices?.length) return 0;
  // Only phones whose app can clear the number get one (1.0.2 and later);
  // older builds would be stuck showing it.
  const badge = (devices as { badges?: boolean | null }[]).some((d) => d.badges)
    ? await badgeCount(row.user_id).catch(() => undefined)
    : undefined;

  let sent = 0;
  for (const d of devices as { id: string; token: string; apns_env: ApnsEnv | null; platform: string | null; badges?: boolean | null }[]) {
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
        ...(d.badges && typeof badge === "number" ? { badge } : {}),
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

// ---- Quiet hours ----
// Nobody wants a classified alert buzzing at 2 a.m. Between 9 p.m. and 8 a.m.
// on the member's phone, pushes wait and go out at 8. Messages and account
// notices still come through right away.
const QUIET_START = 21;
const QUIET_END = 8;
const ALWAYS_NOW = new Set(["moderation", "report", "message"]);
const DEFAULT_TZ = "America/Los_Angeles";

function localHour(tz: string, at: Date = new Date()): number {
  try {
    const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(at);
    return Number(h) % 24;
  } catch {
    return localHour(DEFAULT_TZ, at);
  }
}

/** When quiet hours end for this time zone, or null if it isn't quiet now. */
export function quietUntil(tz: string | null | undefined, now: Date = new Date()): Date | null {
  const zone = tz || DEFAULT_TZ;
  const h = localHour(zone, now);
  if (h < QUIET_START && h >= QUIET_END) return null;
  // Step forward by whole hours until it's 8 a.m. there (handles any offset or DST).
  const t = new Date(now);
  t.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 14; i++) {
    t.setUTCHours(t.getUTCHours() + 1);
    if (localHour(zone, t) === QUIET_END) return t;
  }
  return new Date(now.getTime() + 8 * 3600_000);
}

async function userTimeZone(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("push_devices")
    .select("time_zone")
    .eq("user_id", userId)
    .not("time_zone", "is", null)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { time_zone?: string | null } | null)?.time_zone ?? null;
}

/** Push one notification, if it's new and nobody has pushed it yet. */
export async function pushNotificationById(id: string): Promise<number> {
  if (!apnsConfigured() && !fcmConfigured()) return 0;
  const now = new Date();
  const since = new Date(now.getTime() - RECENT_MINUTES * 60_000).toISOString();

  const { data: peek } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, type, created_at, push_after, pushed_at")
    .eq("id", id)
    .maybeSingle();
  const n = peek as { user_id: string; type: string | null; created_at: string; push_after: string | null; pushed_at: string | null } | null;
  if (!n || n.pushed_at) return 0;

  const held = n.push_after !== null;
  if (held) {
    // Held overnight: due now, and not stale (a missed morning shouldn't fire at noon).
    if (new Date(n.push_after!) > now || now.getTime() - new Date(n.push_after!).getTime() > 3 * 3600_000) return 0;
  } else {
    if (n.created_at < since) return 0;
    if (!ALWAYS_NOW.has(n.type ?? "") && !NOT_WORTH_A_BUZZ.has(n.type ?? "")) {
      const until = quietUntil(await userTimeZone(n.user_id), now);
      if (until) {
        await supabaseAdmin.from("notifications").update({ push_after: until.toISOString() }).eq("id", id).is("pushed_at", null);
        return 0;
      }
    }
  }

  const { data } = await supabaseAdmin
    .from("notifications")
    .update({ pushed_at: now.toISOString() })
    .eq("id", id)
    .is("pushed_at", null)
    .select("id, user_id, type, title, body, link")
    .maybeSingle();
  if (!data) return 0;
  return pushRow(data as Row);
}

/**
 * A push with no bell row behind it, for new messages: they live in the
 * Messages inbox, not the bell, but should still reach the phone right away.
 */
export async function pushDirect(
  userId: string,
  msg: { title: string; body: string | null; link: string | null; type: string }
): Promise<number> {
  if (!apnsConfigured() && !fcmConfigured()) return 0;
  return pushRow({ id: "direct", user_id: userId, type: msg.type, title: msg.title, body: msg.body, link: msg.link });
}

/** The cron's sweep: anything recent the instant ping missed, plus pushes held overnight that are now due. */
export async function pushPending(limit = 100): Promise<{ claimed: number; sent: number }> {
  if (!apnsConfigured() && !fcmConfigured()) return { claimed: 0, sent: 0 };
  const now = new Date();
  const since = new Date(now.getTime() - RECENT_MINUTES * 60_000).toISOString();
  // Only people with the app installed, so the sweep stays small.
  const { data: owners } = await supabaseAdmin.from("push_devices").select("user_id");
  const userIds = Array.from(new Set((owners ?? []).map((o: { user_id: string }) => o.user_id)));
  if (!userIds.length) return { claimed: 0, sent: 0 };

  const [{ data: fresh }, { data: due }] = await Promise.all([
    supabaseAdmin
      .from("notifications")
      .select("id")
      .is("pushed_at", null)
      .is("push_after", null)
      .gte("created_at", since)
      .in("user_id", userIds)
      .order("created_at", { ascending: true })
      .limit(limit),
    supabaseAdmin
      .from("notifications")
      .select("id")
      .is("pushed_at", null)
      .lte("push_after", now.toISOString())
      .gte("push_after", new Date(now.getTime() - 3 * 3600_000).toISOString())
      .in("user_id", userIds)
      .order("push_after", { ascending: true })
      .limit(limit),
  ]);

  let claimed = 0;
  let sent = 0;
  for (const p of [...(fresh ?? []), ...(due ?? [])] as { id: string }[]) {
    sent += await pushNotificationById(p.id);
    claimed++;
  }
  return { claimed, sent };
}
