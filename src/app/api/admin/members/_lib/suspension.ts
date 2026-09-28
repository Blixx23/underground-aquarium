import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Suspending and unsuspending a member, shared by the Reports queue (which
 * suspends from a profile report) and the Suspended accounts list (which
 * lifts a suspension).
 *
 * Why the auth ban: the old suspension only stamped `suspended_at` on the
 * profile, which only the public profile page checked. A Supabase Auth ban
 * stops the member signing in and stops their session being refreshed, so
 * they are locked out everywhere within about an hour at most (the life of
 * the access token they already hold).
 *
 * Why app_metadata: to undo a suspension cleanly we need to know which ads
 * and tanks the suspension hid, so we do not switch on ads the member had
 * already taken down or tanks they kept private on purpose. There is no
 * database column for that, so we keep the two id lists on the auth user's
 * app_metadata. Only the service role can write app_metadata (members cannot
 * edit it), and a banned member gets no session, so the list never ends up
 * in their sign-in token while it is large.
 */

// Roughly 100 years. Supabase has no "forever" value, so this is the usual
// way to ban until someone lifts it.
const BAN_FOREVER = "876000h";

// The status the codebase already uses for an ad a moderator took down.
// My listings shows it with the "removed" badge and offers no Repost button.
export const REMOVED_LISTING_STATUS = "removed";

// app_metadata key holding what the suspension hid.
const HIDDEN_KEY = "ua_suspension_hidden";

// Keep the saved lists to a sane size. Nobody real has more ads or tanks than
// this; the cap only protects the auth record from something runaway.
const MAX_TRACKED = 500;

type HiddenRecord = { listings: string[]; tanks: string[] };

// Supabase errors are plain objects, so read the message field directly.
function errText(err: unknown): string {
  if (!err) return "Unknown error.";
  const e = err as { message?: string; details?: string };
  return e.message || e.details || "Unknown error.";
}

function readHidden(meta: unknown): HiddenRecord {
  const raw = (meta as Record<string, unknown> | null | undefined)?.[HIDDEN_KEY] as
    | { listings?: unknown; tanks?: unknown }
    | undefined;
  const ids = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return { listings: ids(raw?.listings), tanks: ids(raw?.tanks) };
}

/**
 * Suspends a member: ban at the auth level, stamp the profile, take down
 * their live classified ads and make their public tanks private, and
 * remember which ads and tanks were touched so unsuspending can restore
 * exactly those. Returns an error message, or null when it worked.
 */
export async function suspendMember(
  memberId: string,
  adminId: string,
  reason: string | null
): Promise<string | null> {
  // Suspension now bans sign-in, so suspending yourself or another admin
  // could lock every admin out of the site. Refuse both; demote first if
  // an admin account really has to be suspended.
  if (memberId === adminId) {
    return "You can't suspend your own account.";
  }
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", memberId)
    .maybeSingle();
  if (target?.is_admin) {
    return "That member is an admin. Remove their admin access before suspending them.";
  }

  // Ban first. If the auth side fails, stop before hiding anything so the
  // admin does not end up with a half-suspended account.
  const { data: authUser, error: getErr } =
    await supabaseAdmin.auth.admin.getUserById(memberId);
  if (getErr || !authUser?.user) {
    return `Couldn't find that member's sign-in account: ${errText(getErr)}`;
  }
  const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(
    memberId,
    { ban_duration: BAN_FOREVER }
  );
  if (banErr) {
    return `Couldn't block sign-in: ${errText(banErr)}`;
  }

  const now = new Date().toISOString();
  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({
      suspended_at: now,
      suspended_reason: reason,
      suspended_by: adminId,
    })
    .eq("id", memberId);
  if (profErr) {
    return `Sign-in is blocked, but the profile didn't update: ${errText(profErr)}`;
  }

  // Which ads are live and which tanks are public right now.
  const [{ data: liveAds }, { data: publicTanks }] = await Promise.all([
    supabaseAdmin
      .from("listings")
      .select("id")
      .eq("user_id", memberId)
      .eq("status", "active"),
    supabaseAdmin
      .from("tanks")
      .select("id")
      .eq("user_id", memberId)
      .eq("is_public", true),
  ]);
  const adIds = (liveAds ?? []).map((r) => (r as { id: string }).id);
  const tankIds = (publicTanks ?? []).map((r) => (r as { id: string }).id);

  if (adIds.length > 0) {
    await supabaseAdmin
      .from("listings")
      .update({ status: REMOVED_LISTING_STATUS })
      .in("id", adIds);
  }
  // Every tank goes private, as before. Only the public ones are remembered,
  // because those are the ones to switch back on later.
  await supabaseAdmin
    .from("tanks")
    .update({ is_public: false })
    .eq("user_id", memberId);

  // Merge with anything an earlier suspension already saved, so suspending
  // twice in a row does not forget the first list.
  const before = readHidden(authUser.user.app_metadata);
  const record: HiddenRecord = {
    listings: Array.from(new Set([...before.listings, ...adIds])).slice(0, MAX_TRACKED),
    tanks: Array.from(new Set([...before.tanks, ...tankIds])).slice(0, MAX_TRACKED),
  };
  // Supabase merges app_metadata key by key, so this leaves the sign-in
  // provider details that live there untouched.
  const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(
    memberId,
    { app_metadata: { [HIDDEN_KEY]: record } }
  );
  if (metaErr) {
    // The suspension itself worked. Only the undo list is missing, so the
    // admin would have to restore ads and tanks by hand later.
    console.error("suspendMember: couldn't save hidden list", errText(metaErr));
  }

  return null;
}

/**
 * Lifts a suspension: removes the auth ban, clears the profile stamp, and
 * puts back the ads and tanks that the suspension hid. Returns an error
 * message, or null when it worked, plus how much was restored.
 */
export async function unsuspendMember(
  memberId: string
): Promise<{ error: string | null; ads: number; tanks: number }> {
  const { data: authUser, error: getErr } =
    await supabaseAdmin.auth.admin.getUserById(memberId);
  if (getErr || !authUser?.user) {
    return {
      error: `Couldn't find that member's sign-in account: ${errText(getErr)}`,
      ads: 0,
      tanks: 0,
    };
  }
  const hidden = readHidden(authUser.user.app_metadata);

  // Setting the key to null removes it from app_metadata.
  const { error: unbanErr } = await supabaseAdmin.auth.admin.updateUserById(
    memberId,
    { ban_duration: "none", app_metadata: { [HIDDEN_KEY]: null } }
  );
  if (unbanErr) {
    return { error: `Couldn't lift the sign-in block: ${errText(unbanErr)}`, ads: 0, tanks: 0 };
  }

  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({ suspended_at: null, suspended_reason: null, suspended_by: null })
    .eq("id", memberId);
  if (profErr) {
    return {
      error: `Sign-in works again, but the profile didn't update: ${errText(profErr)}`,
      ads: 0,
      tanks: 0,
    };
  }

  // Ads: only the ones the suspension took down and that are still in that
  // state. An ad past its expiry date comes back as expired rather than live,
  // so the member can repost it from My listings like any other expired ad.
  let ads = 0;
  if (hidden.listings.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from("listings")
      .select("id, expires_at")
      .eq("user_id", memberId)
      .eq("status", REMOVED_LISTING_STATUS)
      .in("id", hidden.listings);
    const nowMs = Date.now();
    const stillValid: string[] = [];
    const pastExpiry: string[] = [];
    for (const r of (rows ?? []) as { id: string; expires_at: string | null }[]) {
      const exp = r.expires_at ? new Date(r.expires_at).getTime() : 0;
      if (exp > nowMs) stillValid.push(r.id);
      else pastExpiry.push(r.id);
    }
    if (stillValid.length > 0) {
      await supabaseAdmin
        .from("listings")
        .update({ status: "active" })
        .in("id", stillValid);
    }
    if (pastExpiry.length > 0) {
      await supabaseAdmin
        .from("listings")
        .update({ status: "expired" })
        .in("id", pastExpiry);
    }
    ads = stillValid.length;
  }

  let tanks = 0;
  if (hidden.tanks.length > 0) {
    await supabaseAdmin
      .from("tanks")
      .update({ is_public: true })
      .eq("user_id", memberId)
      .in("id", hidden.tanks);
    tanks = hidden.tanks.length;
  }

  return { error: null, ads, tanks };
}
