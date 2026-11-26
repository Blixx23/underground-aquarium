import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/marketplace/listings";
import { milesBetween } from "@/lib/marketplace/match";
import { quarterOf, quarterRange, quarterLabel, tierOf, awardsFor } from "@/lib/stores/topShops";

/**
 * The small, timely notifications that bring people back for a reason:
 * reply reminders, event reminders, saved-ad price drops, water test
 * reminders, the come-back note, and Top Stores news for shop owners.
 * Each one lands in the bell (so members can switch any of them off),
 * then push and email follow the member's own settings and quiet hours.
 * Every job checks what it already sent, so running it twice sends nothing new.
 */

type Row = { user_id: string; type: string; title: string; body: string; link: string; data?: Record<string, unknown> };

const HOUR = 3600_000;
const DAY = 24 * HOUR;

async function insertAll(rows: Row[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 200));
    if (error) console.error("[nudges] insert", error.message);
    else n += rows.slice(i, i + 200).length;
  }
  return n;
}

/** Values of data->>key already sent for this notification type. */
async function alreadySent(type: string, key: string, since: Date): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("user_id, data")
    .eq("type", type)
    .gte("created_at", since.toISOString())
    .limit(20000);
  return new Set(
    ((data ?? []) as { user_id: string; data: Record<string, unknown> | null }[]).map(
      (r) => `${r.user_id}:${String(r.data?.[key] ?? "")}`
    )
  );
}

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

// ---------------------------------------------------------------------------
// 1. Someone's waiting on your reply: a day after an unanswered message.
// ---------------------------------------------------------------------------
export async function replyNudges(now = new Date()): Promise<number> {
  const from = new Date(now.getTime() - 3 * DAY).toISOString();
  const to = new Date(now.getTime() - DAY).toISOString();
  const { data: threads } = await supabaseAdmin
    .from("listing_threads")
    .select("id, listing_id, buyer_id, seller_id, last_message_at")
    .gte("last_message_at", from)
    .lte("last_message_at", to)
    .limit(2000);
  const list = (threads ?? []) as { id: string; listing_id: string | null; buyer_id: string; seller_id: string; last_message_at: string }[];
  if (!list.length) return 0;

  // Who sent the last message in each thread.
  const lastBy = new Map<string, string>();
  for (let i = 0; i < list.length; i += 200) {
    const { data } = await supabaseAdmin
      .from("listing_messages")
      .select("thread_id, sender_id, created_at")
      .in("thread_id", list.slice(i, i + 200).map((t) => t.id))
      .order("created_at", { ascending: false })
      .limit(5000);
    for (const m of (data ?? []) as { thread_id: string; sender_id: string }[]) {
      if (!lastBy.has(m.thread_id)) lastBy.set(m.thread_id, m.sender_id);
    }
  }

  const listingIds = [...new Set(list.map((t) => t.listing_id).filter(Boolean))] as string[];
  const titles = new Map<string, { title: string; status: string }>();
  if (listingIds.length) {
    const { data } = await supabaseAdmin.from("listings").select("id, title, status").in("id", listingIds);
    for (const l of (data ?? []) as { id: string; title: string; status: string }[]) titles.set(l.id, l);
  }
  const senders = [...new Set([...lastBy.values()])];
  const names = new Map<string, string>();
  if (senders.length) {
    const { data } = await supabaseAdmin.from("profiles").select("id, username").in("id", senders);
    for (const p of (data ?? []) as { id: string; username: string | null }[]) names.set(p.id, p.username ?? "Someone");
  }

  const sent = await alreadySent("reply_nudge", "thread_id", new Date(now.getTime() - 7 * DAY));
  const rows: Row[] = [];
  for (const t of list) {
    const last = lastBy.get(t.id);
    if (!last) continue;
    const waiting = last === t.buyer_id ? t.seller_id : t.buyer_id;
    if (sent.has(`${waiting}:${t.id}`)) continue;
    const listing = t.listing_id ? titles.get(t.listing_id) : null;
    if (listing && listing.status !== "active") continue; // sold or gone: nothing to reply about
    const who = names.get(last) ?? "Someone";
    rows.push({
      user_id: waiting,
      type: "reply_nudge",
      title: `${who} is waiting on your reply`,
      body: listing ? `About "${clip(listing.title, 60)}". A quick answer helps, even if it's sold.` : "They messaged you yesterday.",
      link: `/messages/${t.id}`,
      data: { thread_id: t.id },
    });
  }
  return insertAll(rows);
}

// ---------------------------------------------------------------------------
// 2. Event tomorrow: for anyone marked going or interested.
// ---------------------------------------------------------------------------
export async function eventReminders(now = new Date()): Promise<number> {
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, slug, title, starts_at, venue_name, city, is_online, status")
    .gte("starts_at", new Date(now.getTime() + 18 * HOUR).toISOString())
    .lte("starts_at", new Date(now.getTime() + 30 * HOUR).toISOString())
    .neq("status", "pending")
    .limit(200);
  const list = (events ?? []) as { id: string; slug: string; title: string; starts_at: string; venue_name: string | null; city: string | null; is_online: boolean | null; status: string | null }[];
  if (!list.length) return 0;
  const { data: rsvps } = await supabaseAdmin
    .from("event_rsvps")
    .select("event_id, user_id, status")
    .in("event_id", list.map((e) => e.id))
    .in("status", ["going", "interested"]);
  const sent = await alreadySent("event_reminder", "event_id", new Date(now.getTime() - 3 * DAY));
  const byId = new Map(list.map((e) => [e.id, e]));
  const rows: Row[] = [];
  for (const r of (rsvps ?? []) as { event_id: string; user_id: string; status: string }[]) {
    if (sent.has(`${r.user_id}:${r.event_id}`)) continue;
    const e = byId.get(r.event_id)!;
    const where = e.is_online ? "online" : e.venue_name || e.city || "";
    rows.push({
      user_id: r.user_id,
      type: "event_reminder",
      title: `Tomorrow: ${clip(e.title, 70)}`,
      body: where ? `See you ${e.is_online ? "" : "at "}${where}. Details and directions inside.` : "Details and directions inside.",
      link: `/events/${e.slug}`,
      data: { event_id: e.id },
    });
  }
  return insertAll(rows);
}

// ---------------------------------------------------------------------------
// 3. Saved ads: the price dropped, or it sold.
// ---------------------------------------------------------------------------
export async function savedAdUpdates(): Promise<number> {
  const { data: saves } = await supabaseAdmin
    .from("listing_saves")
    .select("user_id, listing_id, price_cents, sold_notified")
    .eq("sold_notified", false)
    .limit(20000);
  const list = (saves ?? []) as { user_id: string; listing_id: string; price_cents: number | null; sold_notified: boolean }[];
  if (!list.length) return 0;
  const ids = [...new Set(list.map((s) => s.listing_id))];
  const listings = new Map<string, { id: string; slug: string; title: string; price_cents: number | null; status: string; user_id: string }>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await supabaseAdmin.from("listings").select("id, slug, title, price_cents, status, user_id").in("id", ids.slice(i, i + 300));
    for (const l of (data ?? []) as { id: string; slug: string; title: string; price_cents: number | null; status: string; user_id: string }[]) listings.set(l.id, l);
  }

  const rows: Row[] = [];
  for (const s of list) {
    const l = listings.get(s.listing_id);
    if (!l || l.user_id === s.user_id) continue;
    if (l.status === "sold") {
      rows.push({
        user_id: s.user_id,
        type: "saved_ad",
        title: `Sold: ${clip(l.title, 70)}`,
        body: "An ad you saved was marked sold. Set an alert and we'll tell you when another one is posted.",
        link: `/listing/${l.slug}`,
        data: { listing_id: l.id, kind: "sold" },
      });
      await supabaseAdmin.from("listing_saves").update({ sold_notified: true }).eq("user_id", s.user_id).eq("listing_id", s.listing_id);
      continue;
    }
    if (l.status !== "active") continue;
    const was = s.price_cents;
    const now = l.price_cents;
    if (was !== null && now !== null && now < was) {
      rows.push({
        user_id: s.user_id,
        type: "saved_ad",
        title: `Price drop: ${clip(l.title, 60)}`,
        body: `Now ${formatPrice(now)}, down from ${formatPrice(was)}.`,
        link: `/listing/${l.slug}`,
        data: { listing_id: l.id, kind: "price", price: now },
      });
    }
    if (now !== was) {
      // Remember the price we've told them about (rises too, so a later drop is measured from there).
      await supabaseAdmin.from("listing_saves").update({ price_cents: now }).eq("user_id", s.user_id).eq("listing_id", s.listing_id);
    }
  }
  return insertAll(rows);
}

// ---------------------------------------------------------------------------
// 4. Water test reminders: only for members who turned them on.
// ---------------------------------------------------------------------------
export async function waterReminders(now = new Date()): Promise<number> {
  // Mornings only (Pacific), so the email lands at a sensible time too.
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 8 || hour > 11) return 0;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, water_reminder_days, water_reminder_last_at")
    .not("water_reminder_days", "is", null)
    .is("deleted_at", null)
    .limit(5000);
  const rows: Row[] = [];
  const due: string[] = [];
  for (const p of (data ?? []) as { id: string; water_reminder_days: number; water_reminder_last_at: string | null }[]) {
    const last = p.water_reminder_last_at ? new Date(p.water_reminder_last_at).getTime() : 0;
    // A few hours' slack so a weekly reminder keeps the same morning.
    if (now.getTime() - last < p.water_reminder_days * DAY - 6 * HOUR) continue;
    due.push(p.id);
    rows.push({
      user_id: p.id,
      type: "water_reminder",
      title: "Time to test your water",
      body: "Dip a strip, enter the numbers, and Water Check tells you if anything needs fixing.",
      link: "/water-check",
    });
  }
  const n = await insertAll(rows);
  if (due.length) await supabaseAdmin.from("profiles").update({ water_reminder_last_at: now.toISOString() }).in("id", due);
  return n;
}

// ---------------------------------------------------------------------------
// 5. While you were away: once, after 14 days without a visit.
// ---------------------------------------------------------------------------
export async function comebackNudges(now = new Date()): Promise<number> {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour !== 10) return 0; // once a day, mid-morning Pacific
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const { data: people } = await supabaseAdmin
    .from("profiles")
    .select("id, last_active_date, comeback_nudged_at")
    .lte("last_active_date", day(new Date(now.getTime() - 14 * DAY)))
    .gte("last_active_date", day(new Date(now.getTime() - 60 * DAY)))
    .is("deleted_at", null)
    .is("suspended_at", null)
    .limit(1000);
  const list = ((people ?? []) as { id: string; last_active_date: string; comeback_nudged_at: string | null }[]).filter(
    // Once per absence: not nudged since they were last here.
    (p) => !p.comeback_nudged_at || p.comeback_nudged_at.slice(0, 10) < p.last_active_date
  );
  if (!list.length) return 0;

  // New ads since the oldest absence, with where they are.
  const oldest = list.reduce((m, p) => (p.last_active_date < m ? p.last_active_date : m), list[0].last_active_date);
  const [{ data: ads }, { data: regions }, { data: alerts }] = await Promise.all([
    supabaseAdmin.from("listings").select("user_id, region_id, created_at").eq("status", "active").gte("created_at", oldest).limit(5000),
    supabaseAdmin.from("market_regions").select("id, lat, lng"),
    supabaseAdmin.from("listing_alerts").select("user_id, lat, lng, place_label").eq("active", true).in("user_id", list.map((p) => p.id)),
  ]);
  const regionAt = new Map(((regions ?? []) as { id: string; lat: number | null; lng: number | null }[]).filter((r) => r.lat !== null).map((r) => [r.id, r]));
  const adList = ((ads ?? []) as { user_id: string; region_id: string | null; created_at: string }[]).map((a) => ({ ...a, region: a.region_id ? regionAt.get(a.region_id) : undefined }));
  const spot = new Map<string, { lat: number; lng: number; label: string }>();
  for (const a of (alerts ?? []) as { user_id: string; lat: number; lng: number; place_label: string }[]) if (!spot.has(a.user_id)) spot.set(a.user_id, { lat: a.lat, lng: a.lng, label: a.place_label });

  const rows: Row[] = [];
  for (const p of list) {
    const since = adList.filter((a) => a.created_at.slice(0, 10) > p.last_active_date && a.user_id !== p.id);
    const s = spot.get(p.id);
    const near = s ? since.filter((a) => a.region && milesBetween(s, { lat: a.region.lat!, lng: a.region.lng! }) <= 40) : [];
    const count = s ? near.length : since.length;
    if (count < 3) continue; // nothing worth coming back for yet; try again tomorrow
    rows.push({
      user_id: p.id,
      type: "comeback",
      title: s ? `${count} new ads near ${clip(s.label, 30)}` : `${count} new ads since your last visit`,
      body: "Fish, plants and gear from keepers nearby. Take a look before they're gone.",
      link: "/marketplace",
    });
  }
  const n = await insertAll(rows);
  if (rows.length) await supabaseAdmin.from("profiles").update({ comeback_nudged_at: now.toISOString() }).in("id", rows.map((r) => r.user_id));
  return n;
}

// ---------------------------------------------------------------------------
// 6. Top Stores, for shop owners.
// ---------------------------------------------------------------------------
async function ownersOf(storeIds: string[]): Promise<Map<string, { owner: string; name: string; slug: string }>> {
  const out = new Map<string, { owner: string; name: string; slug: string }>();
  if (!storeIds.length) return out;
  const { data } = await supabaseAdmin.from("fish_stores").select("id, name, slug, claimed_by").in("id", storeIds).not("claimed_by", "is", null);
  for (const s of (data ?? []) as { id: string; name: string; slug: string; claimed_by: string }[]) out.set(s.id, { owner: s.claimed_by, name: s.name, slug: s.slug });
  return out;
}

/** After a quarter is locked in: tell each owner which badge their shop earned. */
export async function topShopAwardNotices(quarter: string): Promise<number> {
  const awards = await awardsFor(quarter);
  const owners = await ownersOf(awards.map((a) => a.store_id));
  const sent = await alreadySent("top_shop", "key", new Date(Date.now() - 120 * DAY));
  const rows: Row[] = [];
  for (const a of awards.filter((x) => !x.provisional)) {
    const o = owners.get(a.store_id);
    const tier = tierOf(a.rank);
    if (!o || !tier) continue;
    const key = `award-${quarter}-${a.store_id}`;
    if (sent.has(`${o.owner}:${key}`)) continue;
    rows.push({
      user_id: o.owner,
      type: "top_shop",
      title: `${clip(o.name, 50)} is a Top ${tier} Store`,
      body: `Ranked #${a.rank} for ${quarterLabel(quarter)}. The badge is on your shop page until next quarter's results.`,
      link: `/top-stores`,
      data: { key },
    });
  }
  return insertAll(rows);
}

/** Midway through the quarter: shops just outside a tier hear how close they are. */
export async function topShopCloseNudges(now = new Date()): Promise<number> {
  const quarter = quarterOf(now);
  const { from } = quarterRange(quarter);
  const daysIn = Math.floor((now.getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY);
  if (daysIn < 45 || daysIn > 47) return 0; // once, mid-quarter (the key below stops repeats)
  const tomorrow = new Date(now.getTime() + DAY).toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin.rpc("top_shops_between", { p_from: from, p_to: tomorrow, p_limit: 130 });
  if (error) {
    console.error("[nudges] standings", error.message);
    return 0;
  }
  const rows0 = ((data ?? []) as { store_id: string; rank: number }[]).map((r) => ({ store_id: r.store_id, rank: Number(r.rank) }));
  const close = rows0
    .map((r) => {
      const target = r.rank > 100 ? 100 : r.rank > 50 ? 50 : r.rank > 25 ? 25 : null;
      return target && r.rank - target <= 10 ? { ...r, target } : null;
    })
    .filter(Boolean) as { store_id: string; rank: number; target: number }[];
  const owners = await ownersOf(close.map((c) => c.store_id));
  const sent = await alreadySent("top_shop", "key", new Date(now.getTime() - 60 * DAY));
  const rows: Row[] = [];
  for (const c of close) {
    const o = owners.get(c.store_id);
    if (!o) continue;
    const key = `close-${quarter}-${c.store_id}`;
    if (sent.has(`${o.owner}:${key}`)) continue;
    const gap = c.rank - c.target;
    rows.push({
      user_id: o.owner,
      type: "top_shop",
      title: `${clip(o.name, 40)} is #${c.rank}, ${gap} ${gap === 1 ? "spot" : "spots"} from Top ${c.target}`,
      body: "Posting updates, answering reviews and getting new followers all count. Results lock in at the end of the quarter.",
      link: `/top-stores`,
      data: { key },
    });
  }
  return insertAll(rows);
}
