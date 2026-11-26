"use client";

import type { createClient } from "@/lib/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;
import type { Notification } from "@/lib/notifications";

/**
 * Tells every bell on the page to recount. The notifications page and the bell
 * are separate pieces, so without this, clearing or reading notices on the page
 * left a stale number on the bell (most noticeable in the app, where the header
 * never reloads).
 */
export const NOTIFICATIONS_CHANGED = "ua:notifications-changed";
function changed() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}

/**
 * The writes behind the bell and the notifications page. Row-level security
 * keeps every one of these to the signed-in person's own notifications.
 */
export async function setRead(supabase: SupabaseClient, id: string, read: boolean) {
  await supabase.from("notifications").update({ read }).eq("id", id);
  changed();
}

export async function markAllRead(supabase: SupabaseClient) {
  await supabase.from("notifications").update({ read: true }).eq("read", false);
  changed();
}

export async function removeOne(supabase: SupabaseClient, id: string) {
  await supabase.from("notifications").delete().eq("id", id);
  changed();
}

export async function clearRead(supabase: SupabaseClient) {
  await supabase.from("notifications").delete().eq("read", true);
  changed();
}

/** Opening the bell counts as "seen": the badge clears, unread stays bold. */
export async function markSeen(supabase: SupabaseClient, userId: string) {
  await supabase.from("profiles").update({ notifications_seen_at: new Date().toISOString() }).eq("id", userId);
  changed();
}

/** Toggle one notification type in the person's muted list. Returns the new list. */
export async function toggleMuted(
  supabase: SupabaseClient,
  userId: string,
  muted: string[],
  n: Notification
): Promise<string[] | null> {
  const t = n.type;
  if (!t) return null;
  const next = muted.includes(t) ? muted.filter((x) => x !== t) : [...muted, t];
  const { error } = await supabase.from("profiles").update({ muted_notifications: next }).eq("id", userId);
  return error ? null : next;
}
