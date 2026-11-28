"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";
import { NOTIFICATIONS_CHANGED } from "@/components/notifications/actions";

/**
 * The number on the app icon, inside the app only (builds 1.0.2 and later):
 * unread notifications plus message threads with something new, the same
 * count every push carries. Kept current while the app is open, so reading
 * things in the app clears the icon. Signed out, the icon is cleared.
 */
type BadgePlugin = { set(o: { count: number }): Promise<void>; clear(): Promise<void> };

function badgePlugin(): BadgePlugin | null {
  try {
    const cap = (window as unknown as {
      Capacitor?: { isPluginAvailable?: (n: string) => boolean; Plugins?: Record<string, unknown> };
    }).Capacitor;
    if (!cap?.isPluginAvailable?.("Badge")) return null;
    return (cap.Plugins?.Badge as BadgePlugin) ?? null;
  } catch {
    return null;
  }
}

/** Only the app (with the badge plugin) runs the counting below; the website skips it entirely. */
export default function AppBadge() {
  const [plugin, setPlugin] = useState<BadgePlugin | null>(null);
  useEffect(() => setPlugin(badgePlugin()), []);
  return plugin ? <BadgeCounter plugin={plugin} /> : null;
}

function BadgeCounter({ plugin }: { plugin: BadgePlugin }) {
  const supabase = useMemo(() => createClient(), []);
  const { signedIn, count: messages } = useUnreadMessages();
  const [notes, setNotes] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false)
        .gte("created_at", since);
      if (active) setNotes(count ?? 0);
    };
    load().catch(() => {});
    const onChange = () => load().catch(() => {});
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    window.addEventListener("focus", onChange);
    const tick = setInterval(onChange, 60000);
    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
      window.removeEventListener("focus", onChange);
      clearInterval(tick);
    };
  }, [plugin, supabase]);

  useEffect(() => {
    const total = signedIn ? Math.min(99, notes + messages) : 0;
    (total > 0 ? plugin.set({ count: total }) : plugin.clear()).catch(() => {});
  }, [plugin, signedIn, notes, messages]);

  return null;
}
