import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { listingInCategory } from "@/lib/marketplace/categories";
import { listingHref } from "@/lib/marketplace/listings";
import { alertMatches, milesBetween, wantedMatches, WANTED_RADIUS_MILES } from "@/lib/marketplace/match";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Every 10 minutes: tells members about new classified ads they care about.
 *
 * 1. Saved alerts: each new ad (last 2 days) is matched against every active
 *    alert by distance, category and words.
 * 2. Wanted posts: a new ad that looks like what someone near it wants tells
 *    the person who wants it; a new Wanted post that looks like an ad near it
 *    tells the seller someone is looking.
 *
 * Each pair is recorded, so nobody hears about the same ad twice, and a
 * member gets one bell (and at most the usual notification email) per run,
 * however many ads matched. Blocked members never hear about each other.
 * A run that fails part way simply picks up the rest next time.
 */

type Ad = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  is_free: boolean;
  is_wanted: boolean;
  user_id: string;
  region_id: string | null;
  city: string | null;
  created_at: string;
};
type Alert = {
  id: string;
  user_id: string;
  query: string | null;
  category: string | null;
  lat: number;
  lng: number;
  place_label: string;
  radius_miles: number;
  include_wanted: boolean;
};
type Note = { user_id: string; type: string; title: string; body: string; link: string };

const AD_COLS = "id, slug, title, description, category, is_free, is_wanted, user_id, region_id, city, created_at";

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date().toISOString();
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();

  // Live ads posted in the last two days, and every live Wanted post.
  const [newRes, wantedRes, regionsRes] = await Promise.all([
    supabaseAdmin.from("listings").select(AD_COLS).eq("status", "active").gt("expires_at", now).gte("created_at", since).limit(1000),
    supabaseAdmin.from("listings").select(AD_COLS).eq("status", "active").eq("is_wanted", true).gt("expires_at", now).limit(2000),
    supabaseAdmin.from("market_regions").select("id, lat, lng"),
  ]);
  if (newRes.error) return NextResponse.json({ error: newRes.error.message }, { status: 500 });
  const fresh = (newRes.data ?? []) as Ad[];
  const wanted = (wantedRes.data ?? []) as Ad[];
  const where = new Map(
    ((regionsRes.data ?? []) as { id: string; lat: number | null; lng: number | null }[])
      .filter((r) => r.lat !== null && r.lng !== null)
      .map((r) => [r.id, { lat: r.lat as number, lng: r.lng as number }])
  );
  const at = (ad: Ad) => (ad.region_id ? where.get(ad.region_id) ?? null : null);

  const notes: Note[] = [];
  // What this run recorded, so it can be undone if the bells can't be sent.
  const recordedHits: { alert_id: string; listing_id: string }[] = [];
  const recordedMatches: { wanted_id: string; listing_id: string }[] = [];
  const result = { newAds: fresh.length, alertHits: 0, wantedMatches: 0, notified: 0, errors: [] as string[] };

  // Members who've blocked each other never hear about each other's ads.
  const blocked = new Set<string>();
  {
    const { data } = await supabaseAdmin.from("user_blocks").select("blocker_id, blocked_id").limit(5000);
    for (const b of (data ?? []) as { blocker_id: string; blocked_id: string }[]) {
      blocked.add(`${b.blocker_id}:${b.blocked_id}`);
      blocked.add(`${b.blocked_id}:${b.blocker_id}`);
    }
  }
  const apart = (a: string, b: string) => a === b || blocked.has(`${a}:${b}`);

  // ---- 1. Saved alerts ----
  try {
    const { data: alertRows, error } = await supabaseAdmin
      .from("listing_alerts")
      .select("id, user_id, query, category, lat, lng, place_label, radius_miles, include_wanted")
      .eq("active", true);
    if (error) throw new Error(error.message);
    const alerts = (alertRows ?? []) as Alert[];

    const pairs: { alert: Alert; ad: Ad }[] = [];
    for (const ad of fresh) {
      const spot = at(ad);
      if (!spot) continue;
      for (const al of alerts) {
        if (apart(al.user_id, ad.user_id)) continue;
        if (ad.is_wanted && !al.include_wanted) continue;
        if (al.category && !listingInCategory(ad, al.category)) continue;
        if (milesBetween(al, spot) > al.radius_miles) continue;
        if (!alertMatches(al.query, ad)) continue;
        pairs.push({ alert: al, ad });
      }
    }

    if (pairs.length) {
      // Skip any pair already told about.
      const { data: seen } = await supabaseAdmin
        .from("listing_alert_hits")
        .select("alert_id, listing_id")
        .in("alert_id", [...new Set(pairs.map((p) => p.alert.id))])
        .in("listing_id", [...new Set(pairs.map((p) => p.ad.id))]);
      const done = new Set(((seen ?? []) as { alert_id: string; listing_id: string }[]).map((s) => `${s.alert_id}:${s.listing_id}`));
      const todo = pairs.filter((p) => !done.has(`${p.alert.id}:${p.ad.id}`));

      if (todo.length) {
        // Record first: if this fails, nothing is sent, and the next run tries again.
        const { error: hitError } = await supabaseAdmin
          .from("listing_alert_hits")
          .upsert(todo.map((p) => ({ alert_id: p.alert.id, listing_id: p.ad.id })), { onConflict: "alert_id,listing_id", ignoreDuplicates: true });
        if (hitError) throw new Error(hitError.message);
        recordedHits.push(...todo.map((p) => ({ alert_id: p.alert.id, listing_id: p.ad.id })));
        result.alertHits = todo.length;

        // One bell per member, however many ads matched; an ad matching two alerts counts once.
        const byUser = new Map<string, Map<string, { ad: Ad; alert: Alert }>>();
        for (const p of todo) {
          const m = byUser.get(p.alert.user_id) ?? new Map();
          if (!m.has(p.ad.id)) m.set(p.ad.id, p);
          byUser.set(p.alert.user_id, m);
        }
        for (const [userId, m] of byUser) {
          const list = [...m.values()];
          const first = list[0];
          const what = first.alert.query ? `"${first.alert.query}"` : "your alert";
          notes.push({
            user_id: userId,
            type: "listing_alert",
            title: list.length === 1 ? `New ad near you: ${first.ad.title}` : `${list.length} new ads match your alerts`,
            body:
              list.length === 1
                ? `It matches ${what} within ${first.alert.radius_miles} miles of ${first.alert.place_label}.`
                : list
                    .slice(0, 4)
                    .map((x) => x.ad.title)
                    .join(", ") + (list.length > 4 ? `, and ${list.length - 4} more.` : "."),
            link: list.length === 1 ? listingHref(first.ad.slug) : "/my/alerts",
          });
        }
        await supabaseAdmin
          .from("listing_alerts")
          .update({ last_hit_at: now })
          .in("id", [...new Set(todo.map((p) => p.alert.id))]);
      }
    }
  } catch (e) {
    // Saved alerts may not be set up yet (step 87); Wanted matching still runs.
    result.errors.push(`alerts: ${e instanceof Error ? e.message : "failed"}`);
  }

  // ---- 2. Wanted posts ----
  try {
    const freshIds = new Set(fresh.map((a) => a.id));
    const pairs: { want: Ad; ad: Ad }[] = [];
    const seenPair = new Set<string>();
    const consider = (want: Ad, ad: Ad) => {
      const key = `${want.id}:${ad.id}`;
      if (seenPair.has(key) || apart(want.user_id, ad.user_id)) return;
      if (ad.is_wanted || ad.category !== want.category) return;
      const a = at(want);
      const b = at(ad);
      if (!a || !b || milesBetween(a, b) > WANTED_RADIUS_MILES) return;
      if (!wantedMatches(want.title, ad)) return;
      seenPair.add(key);
      pairs.push({ want, ad });
    };
    // New ads against every live Wanted post.
    for (const ad of fresh) if (!ad.is_wanted) for (const w of wanted) consider(w, ad);
    // New Wanted posts against every live ad in the same category.
    const newWanted = wanted.filter((w) => freshIds.has(w.id));
    if (newWanted.length) {
      const { data: liveAds } = await supabaseAdmin
        .from("listings")
        .select(AD_COLS)
        .eq("status", "active")
        .eq("is_wanted", false)
        .gt("expires_at", now)
        .in("category", [...new Set(newWanted.map((w) => w.category))])
        .limit(3000);
      for (const w of newWanted) for (const ad of (liveAds ?? []) as Ad[]) consider(w, ad);
    }

    if (pairs.length) {
      const { data: seen, error: seenError } = await supabaseAdmin
        .from("listing_wanted_matches")
        .select("wanted_id, listing_id")
        .in("wanted_id", [...new Set(pairs.map((p) => p.want.id))])
        .in("listing_id", [...new Set(pairs.map((p) => p.ad.id))]);
      if (seenError) throw new Error(seenError.message);
      const done = new Set(((seen ?? []) as { wanted_id: string; listing_id: string }[]).map((s) => `${s.wanted_id}:${s.listing_id}`));
      const todo = pairs.filter((p) => !done.has(`${p.want.id}:${p.ad.id}`));
      if (todo.length) {
        const { error: insError } = await supabaseAdmin
          .from("listing_wanted_matches")
          .upsert(todo.map((p) => ({ wanted_id: p.want.id, listing_id: p.ad.id })), { onConflict: "wanted_id,listing_id", ignoreDuplicates: true });
        if (insError) throw new Error(insError.message);
        recordedMatches.push(...todo.map((p) => ({ wanted_id: p.want.id, listing_id: p.ad.id })));
        result.wantedMatches = todo.length;

        // Whoever was there first hears about the newcomer, one bell per member.
        const toBuyer = new Map<string, { want: Ad; ad: Ad }[]>();
        const toSeller = new Map<string, { want: Ad; ad: Ad }[]>();
        for (const p of todo) {
          const adIsNewer = p.ad.created_at >= p.want.created_at;
          const box = adIsNewer ? toBuyer : toSeller;
          const who = adIsNewer ? p.want.user_id : p.ad.user_id;
          box.set(who, [...(box.get(who) ?? []), p]);
        }
        for (const [userId, list] of toBuyer) {
          const first = list[0];
          notes.push({
            user_id: userId,
            type: "wanted_match",
            title: list.length === 1 ? `An ad near you may be what you want: ${first.ad.title}` : `${list.length} ads near you may match your Wanted posts`,
            body: `It looks like your Wanted post "${first.want.title}". Message the seller to check.`,
            link: listingHref(first.ad.slug),
          });
        }
        for (const [userId, list] of toSeller) {
          const first = list[0];
          notes.push({
            user_id: userId,
            type: "wanted_match",
            title: list.length === 1 ? `Someone near you is looking for "${first.want.title}"` : `${list.length} people near you are looking for things you're selling`,
            body: `It may match your ad "${first.ad.title}". Message them from their Wanted post.`,
            link: listingHref(first.want.slug),
          });
        }
      }
    }
  } catch (e) {
    result.errors.push(`wanted: ${e instanceof Error ? e.message : "failed"}`);
  }

  // ---- Send: bells, which the notification emails pick up as usual ----
  if (notes.length) {
    const { error } = await supabaseAdmin.from("notifications").insert(notes);
    if (error) {
      result.errors.push(`notify: ${error.message}`);
      // Undo this run's records so the next run tries these people again.
      for (const h of recordedHits) {
        await supabaseAdmin.from("listing_alert_hits").delete().eq("alert_id", h.alert_id).eq("listing_id", h.listing_id);
      }
      for (const m of recordedMatches) {
        await supabaseAdmin.from("listing_wanted_matches").delete().eq("wanted_id", m.wanted_id).eq("listing_id", m.listing_id);
      }
    } else result.notified = notes.length;
  }

  return NextResponse.json({ ran: true, ...result });
}
